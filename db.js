require("dotenv").config();
const fs = require("fs");
const path = require("path");

const USE_MONGO = !!process.env.MONGODB_URI;

// ============================================================
// JSON FILE DB (local dev)
// ============================================================
const DB_FILE = path.join(__dirname, "database", "data.json");

function loadData() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return {}; }
}
function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getJsonDb() {
  return {
    async getAll(table) { const d = loadData(); return d[table] || []; },
    async findOne(table, field, value) { return (loadData()[table] || []).find(r => r[field] === value) || null; },
    async findById(table, id) { return (loadData()[table] || []).find(r => r.id === Number(id)) || null; },
    async insert(table, record) {
      const d = loadData();
      if (!d[table]) d[table] = [];
      if (!d._counters) d._counters = {};
      if (!d._counters[table]) d._counters[table] = 0;
      d._counters[table]++;
      record.id = d._counters[table];
      if (!record.created_at) record.created_at = new Date().toISOString();
      d[table].push(record);
      saveData(d);
      return record;
    },
    async insertBulk(table, record) { return this.insert(table, record); },
    async bulkInsertMany(table, records) {
      const d = loadData();
      if (!d[table]) d[table] = [];
      if (!d._counters) d._counters = {};
      if (!d._counters[table]) d._counters[table] = 0;
      const inserted = records.map(r => {
        d._counters[table]++;
        const rec = { ...r, id: d._counters[table], created_at: r.created_at || new Date().toISOString() };
        d[table].push(rec);
        return rec;
      });
      saveData(d);
      return inserted;
    },
    async update(table, id, updates) {
      const d = loadData();
      const idx = (d[table] || []).findIndex(r => r.id === Number(id));
      if (idx === -1) return null;
      d[table][idx] = { ...d[table][idx], ...updates };
      saveData(d);
      return d[table][idx];
    },
    async delete(table, id) {
      const d = loadData();
      if (!d[table]) return false;
      d[table] = d[table].filter(r => r.id !== Number(id));
      saveData(d);
      return true;
    },
    async query(table, filterFn) { const rows = loadData()[table] || []; return filterFn ? rows.filter(filterFn) : rows; },
    async deleteWhere(table, filterFn) {
      const d = loadData();
      if (!d[table]) return 0;
      const before = d[table].length;
      d[table] = d[table].filter(r => !filterFn(r));
      saveData(d);
      return before - d[table].length;
    },
    async count(table, filterFn) { const rows = loadData()[table] || []; return filterFn ? rows.filter(filterFn).length : rows.length; },
    async save() {}
  };
}

// ============================================================
// MONGODB DB (production)
// ============================================================
let mongoDbInstance = null;

async function connectMongo() {
  const mongoose = require("mongoose");
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
}

function getMongoDb() {
  const mongoose = require("mongoose");
  const _models = {};
  function mdl(table) {
    if (_models[table]) return _models[table];
    const schema = new mongoose.Schema({}, { strict: false });
    try { _models[table] = mongoose.model(table); }
    catch { _models[table] = mongoose.model(table, schema, table); }
    return _models[table];
  }
  let Counter;
  async function nextId(table) {
    await connectMongo();
    if (!Counter) {
      const cs = new mongoose.Schema({ _id:String, seq:{type:Number,default:0} });
      try { Counter = mongoose.model("_counter"); } catch { Counter = mongoose.model("_counter", cs, "_counters"); }
    }
    const doc = await Counter.findByIdAndUpdate(table, { $inc:{seq:1} }, { upsert:true, new:true });
    return doc.seq;
  }
  function strip(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    const { _id, __v, ...rest } = obj; return rest;
  }
  return {
    async getAll(table) { await connectMongo(); return (await mdl(table).find({}).lean()).map(d=>{const{_id,__v,...r}=d;return r;}); },
    async findOne(table, field, value) { await connectMongo(); const doc=await mdl(table).findOne({[field]:value}).lean(); if(!doc)return null; const{_id,__v,...r}=doc;return r; },
    async findById(table, id) { await connectMongo(); const doc=await mdl(table).findOne({id:Number(id)}).lean(); if(!doc)return null; const{_id,__v,...r}=doc;return r; },
    async insert(table, record) { await connectMongo(); record.id=await nextId(table); if(!record.created_at)record.created_at=new Date().toISOString(); return strip(await mdl(table).create(record)); },
    async insertBulk(table, record) { return this.insert(table, record); },
    async bulkInsertMany(table, records) { await connectMongo(); const ids=await Promise.all(records.map(()=>nextId(table))); const dated=records.map((r,i)=>({...r,id:ids[i],created_at:r.created_at||new Date().toISOString()})); await mdl(table).insertMany(dated,{ordered:false}); return dated; },
    async update(table, id, updates) { await connectMongo(); const doc=await mdl(table).findOneAndUpdate({id:Number(id)},{$set:updates},{new:true}).lean(); if(!doc)return null; const{_id,__v,...r}=doc;return r; },
    async delete(table, id) { await connectMongo(); await mdl(table).deleteOne({id:Number(id)}); return true; },
    async query(table, filterFn) { await connectMongo(); const docs=(await mdl(table).find({}).lean()).map(d=>{const{_id,__v,...r}=d;return r;}); return filterFn?docs.filter(filterFn):docs; },
    async deleteWhere(table, filterFn) { await connectMongo(); const docs=(await mdl(table).find({}).lean()).map(d=>{const{_id,__v,...r}=d;return r;}); const targets=docs.filter(filterFn); if(!targets.length)return 0; await mdl(table).deleteMany({id:{$in:targets.map(d=>d.id)}}); return targets.length; },
    async count(table, filterFn) { if(!filterFn){await connectMongo();return mdl(table).countDocuments();} return(await this.query(table,filterFn)).length; },
    save() {},
    close() {}
  };
}

// ============================================================
// EXPORTS
// ============================================================
function getDb() {
  if (USE_MONGO) return getMongoDb();
  return getJsonDb();
}

async function connect() {
  if (USE_MONGO) {
    await connectMongo();
  } else {
    console.log("Using local JSON database (database/data.json)");
  }
}

module.exports = getDb;
module.exports.connect = connect;

require("dotenv").config();
const getDb = require("./db");
const { connect } = require("./db");
const bcrypt = require("bcryptjs");

const categories = {
  "Electronics": { subcategories:["Smartphones","Laptops","Tablets","Headphones","Cameras","Smartwatches","Speakers","Gaming Consoles","Monitors","Accessories"], brands:["Apple","Samsung","Sony","LG","Dell","HP","Asus","Lenovo","OnePlus","Xiaomi","Google","Microsoft","Bose","JBL","Canon"], priceRange:[99,2999] },
  "Fashion": { subcategories:["Men Shirts","Women Dresses","Jeans","Shoes","Watches","Handbags","Sunglasses","Jackets","Sportswear","Traditional"], brands:["Nike","Adidas","Zara","H&M","Levis","Puma","Gucci","Tommy Hilfiger","Calvin Klein","Ray-Ban","Fossil","Allen Solly","Peter England","U.S. Polo","Woodland"], priceRange:[19,599] },
  "Home & Kitchen": { subcategories:["Furniture","Cookware","Appliances","Decor","Lighting","Storage","Bedding","Bathroom","Garden","Cleaning"], brands:["IKEA","Philips","Prestige","Bosch","Dyson","KitchenAid","Whirlpool","Havells","Crompton","Urban Ladder"], priceRange:[15,1499] },
  "Books": { subcategories:["Fiction","Non-Fiction","Technology","Business","Self-Help","Science","History","Comics","Education","Literature"], brands:["Penguin","HarperCollins","Oxford","Cambridge","Pearson","McGraw-Hill","Wiley","Scholastic","Random House","Simon & Schuster"], priceRange:[5,79] },
  "Sports & Fitness": { subcategories:["Cricket","Football","Gym Equipment","Yoga","Running","Swimming","Cycling","Tennis","Basketball","Boxing"], brands:["Nike","Adidas","Puma","Yonex","Wilson","Under Armour","Reebok","Decathlon","SG","MRF"], priceRange:[10,999] },
  "Beauty & Health": { subcategories:["Skincare","Makeup","Haircare","Perfumes","Supplements","Personal Care","Oral Care","Eye Care","Men Grooming","Wellness"], brands:["Lakme","Maybelline","Nivea","LOreal","Dove","Neutrogena","Himalaya","MAC","Forest Essentials","Biotique"], priceRange:[5,299] },
  "Grocery": { subcategories:["Fruits","Vegetables","Dairy","Snacks","Beverages","Spices","Grains","Bakery","Frozen","Organic"], brands:["Amul","Nestle","Britannia","Parle","Tata","ITC","Haldirams","MTR","Aashirvaad","Fortune"], priceRange:[2,49] },
  "Automotive": { subcategories:["Car Accessories","Bike Accessories","Tyres","Oils & Lubricants","Car Electronics","Helmets","Tools","Cleaning","Lights","Spare Parts"], brands:["Bosch","Castrol","Shell","Philips","3M","Michelin","MRF","CEAT","Kenwood","Pioneer"], priceRange:[10,799] }
};
const adjs=["Premium","Ultra","Pro","Max","Elite","Classic","Advanced","Smart","Super","Mega","Neo","Eco","Turbo","Lite","Plus"];
const sfxs=["Edition","Series","Collection","Range","Line","Set","Pack","Bundle","Kit","Model"];
function rf(min,max,dec=2){return parseFloat((Math.random()*(max-min)+min).toFixed(dec));}
function ri(min,max){return Math.floor(Math.random()*(max-min+1)+min);}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
const IMGS={
  "Electronics":{"Smartphones":["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop"],"Laptops":["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=400&fit=crop"],"_default":["https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&h=400&fit=crop"]},
  "Fashion":{"_default":["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop"]},
  "Home & Kitchen":{"_default":["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop"]},
  "Books":{"_default":["https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop"]},
  "Sports & Fitness":{"_default":["https://images.unsplash.com/photo-1461896836934-bd45ba862e49?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop"]},
  "Beauty & Health":{"_default":["https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop"]},
  "Grocery":{"_default":["https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=400&fit=crop"]},
  "Automotive":{"_default":["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=400&fit=crop"]}
};

(async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connect();
    const db = getDb();
    console.log("Connected!\n");

    // Users
    const existing = await db.findOne("users", "username", "admin");
    if (!existing) {
      await db.insert("users", { username:"admin", email:"admin@ecommerce.com", password:bcrypt.hashSync("admin123",10), role:"admin" });
      await db.insert("users", { username:"user1", email:"user1@test.com", password:bcrypt.hashSync("user123",10), role:"user" });
      console.log("Users created (admin/admin123, user1/user123)");
    } else { console.log("Users exist, skipping..."); }

    // Products
    const pCount = await db.count("products");
    if (pCount === 0) {
      const catNames = Object.keys(categories);
      const productData = [];
      for (let i=0; i<800; i++) {
        const category=catNames[i%catNames.length], cat=categories[category], subcategory=pick(cat.subcategories), brand=pick(cat.brands);
        const name=`${brand} ${pick(adjs)} ${subcategory} ${pick(sfxs)} ${ri(1,99)}`;
        const price=rf(cat.priceRange[0],cat.priceRange[1]), stockPrice=rf(price*0.5,price*3);
        const catImgs=IMGS[category]||{}, subImgs=catImgs[subcategory]||catImgs["_default"]||["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"];
        productData.push({ name, category, subcategory, price, stock_price:stockPrice, stock_change:rf(-50,50), stock_change_percent:rf(-15,15), volume:ri(1000,5000000), market_cap:rf(1000000,999999999), high_52w:stockPrice*rf(1.1,1.8), low_52w:stockPrice*rf(0.3,0.8), pe_ratio:rf(5,85), description:`Premium quality ${subcategory.toLowerCase()} by ${brand}.`, image_url:subImgs[i%subImgs.length], rating:rf(2.5,5.0,1), reviews:ri(5,15000), in_stock:1, stock_qty:ri(50,200) });
      }
      console.log("Inserting 800 products...");
      const inserted = await db.bulkInsertMany("products", productData);
      console.log(`800 products created!`);

      // Stock history
      const historyData = [];
      for (const product of inserted) {
        let hp=product.stock_price;
        for (let d=30; d>=0; d--) {
          const date=new Date(); date.setDate(date.getDate()-d);
          hp=hp+rf(-5,5); if (hp<1) hp=rf(5,20);
          historyData.push({ product_id:product.id, price:parseFloat(hp.toFixed(2)), volume:ri(500,3000000), recorded_at:date.toISOString() });
        }
      }
      console.log(`Inserting ${historyData.length} stock history records...`);
      await db.bulkInsertMany("stock_history", historyData);
      console.log("Stock history created!");
    } else { console.log(`Products exist (${pCount}), skipping...`); }

    // IPOs
    const ipoCount = await db.count("ipos");
    if (ipoCount === 0) {
      const now=new Date(), d=86400000;
      const ipos=[
        { company_name:"NexGen AI Technologies", ticker:"NXAI", sector:"Technology", description:"Leading AI/ML platform company.", logo_url:"https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&h=200&fit=crop", price_band_low:245, price_band_high:260, lot_size:57, issue_size:"4500 Cr", face_value:10, open_date:new Date(now-1*d).toISOString(), close_date:new Date(now+2*d).toISOString(), listing_date:new Date(now+6*d).toISOString(), listing_price:null, subscription_retail:8.5, subscription_hni:12.3, subscription_qib:18.7, status:"active", gmp:85, registrar:"Link Intime", lead_manager:"Goldman Sachs, Morgan Stanley" },
        { company_name:"GreenVolt Energy Corp", ticker:"GVEC", sector:"Renewable Energy", description:"India fastest growing solar & wind energy company.", logo_url:"https://images.unsplash.com/photo-1509391366360-2e959784a276?w=200&h=200&fit=crop", price_band_low:180, price_band_high:195, lot_size:76, issue_size:"3200 Cr", face_value:5, open_date:new Date(now-0.5*d).toISOString(), close_date:new Date(now+3*d).toISOString(), listing_date:new Date(now+7*d).toISOString(), listing_price:null, subscription_retail:4.2, subscription_hni:6.8, subscription_qib:9.1, status:"active", gmp:42, registrar:"KFin Technologies", lead_manager:"ICICI Securities, Axis Capital" },
        { company_name:"CloudMesh Networks", ticker:"CMSH", sector:"Technology", description:"Cloud infrastructure & 5G networking solutions.", logo_url:"https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=200&fit=crop", price_band_low:520, price_band_high:549, lot_size:27, issue_size:"6800 Cr", face_value:10, open_date:new Date(now+3*d).toISOString(), close_date:new Date(now+6*d).toISOString(), listing_date:new Date(now+10*d).toISOString(), listing_price:null, subscription_retail:0, subscription_hni:0, subscription_qib:0, status:"upcoming", gmp:110, registrar:"Link Intime", lead_manager:"JP Morgan, Kotak Mahindra" },
        { company_name:"MedPharma Biotech", ticker:"MPBT", sector:"Healthcare", description:"Biotech firm specializing in oncology drugs.", logo_url:"https://images.unsplash.com/photo-1559757175-5700dde675bc?w=200&h=200&fit=crop", price_band_low:340, price_band_high:362, lot_size:41, issue_size:"5100 Cr", face_value:10, open_date:new Date(now+5*d).toISOString(), close_date:new Date(now+8*d).toISOString(), listing_date:new Date(now+12*d).toISOString(), listing_price:null, subscription_retail:0, subscription_hni:0, subscription_qib:0, status:"upcoming", gmp:65, registrar:"KFin Technologies", lead_manager:"Citigroup, HDFC Securities" },
        { company_name:"UrbanCart Logistics", ticker:"UCRT", sector:"Logistics", description:"Quick-commerce logistics platform.", logo_url:"https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&h=200&fit=crop", price_band_low:88, price_band_high:95, lot_size:157, issue_size:"1800 Cr", face_value:2, open_date:new Date(now+7*d).toISOString(), close_date:new Date(now+10*d).toISOString(), listing_date:new Date(now+14*d).toISOString(), listing_price:null, subscription_retail:0, subscription_hni:0, subscription_qib:0, status:"upcoming", gmp:22, registrar:"Link Intime", lead_manager:"SBI Capital, BofA Securities" },
        { company_name:"PaySecure Fintech", ticker:"PSFT", sector:"Fintech", description:"Digital payments & neo-banking platform.", logo_url:"https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200&h=200&fit=crop", price_band_low:410, price_band_high:435, lot_size:34, issue_size:"7200 Cr", face_value:10, open_date:new Date(now-10*d).toISOString(), close_date:new Date(now-7*d).toISOString(), listing_date:new Date(now-3*d).toISOString(), listing_price:582, subscription_retail:22.5, subscription_hni:38.4, subscription_qib:45.2, status:"listed", gmp:0, registrar:"KFin Technologies", lead_manager:"Goldman Sachs, JM Financial" },
        { company_name:"AgroFresh Foods", ticker:"AGRF", sector:"FMCG", description:"Organic food brand with farm-to-fork supply chain.", logo_url:"https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop", price_band_low:125, price_band_high:135, lot_size:110, issue_size:"2100 Cr", face_value:5, open_date:new Date(now-15*d).toISOString(), close_date:new Date(now-12*d).toISOString(), listing_date:new Date(now-8*d).toISOString(), listing_price:148, subscription_retail:15.8, subscription_hni:28.1, subscription_qib:32.6, status:"listed", gmp:0, registrar:"Link Intime", lead_manager:"Nomura, Edelweiss" },
        { company_name:"SkyDrone Aviation", ticker:"SKYD", sector:"Aerospace", description:"Commercial drone manufacturer.", logo_url:"https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=200&h=200&fit=crop", price_band_low:295, price_band_high:312, lot_size:48, issue_size:"3900 Cr", face_value:10, open_date:new Date(now-20*d).toISOString(), close_date:new Date(now-17*d).toISOString(), listing_date:new Date(now-13*d).toISOString(), listing_price:425, subscription_retail:35.2, subscription_hni:52.7, subscription_qib:61.3, status:"listed", gmp:0, registrar:"KFin Technologies", lead_manager:"Morgan Stanley, CLSA" }
      ];
      await db.bulkInsertMany("ipos", ipos);
      console.log("8 IPOs seeded!");
    } else { console.log(`IPOs exist (${ipoCount}), skipping...`); }

    console.log("\nDatabase seeded successfully!");
    console.log("Admin Login: admin / admin123");
    console.log("User Login: user1 / user123");
    process.exit(0);
  } catch(e) {
    console.error("Seed failed:", e.message);
    process.exit(1);
  }
})();

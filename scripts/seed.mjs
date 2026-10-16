/**
 * Seed script — catalogue data for the industrial storefront.
 *
 *   node scripts/seed.mjs            # default administrator, categories, brands, products
 *   node scripts/seed.mjs --demo     # also seeds demo orders, inquiries, bookings
 *
 * Idempotent: existing records are matched on their unique slug/sku and updated.
 * All images are licensed Unsplash CDN URLs that were verified to return HTTP 200.
 *
 * The administrator step only writes when the database holds no administrator at
 * all, so re-running this never resets an existing account.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI missing in .env.local");
const withDemo = process.argv.includes("--demo");

const IMG = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/* ------------------------------------------------------------------ images */
const IMAGES = {
  hero: IMG("1567789884554-0b844b597180", 1400),
  helmet: IMG("1621905252507-b35492cc74b4"),
  goggles: IMG("1581093588401-fbb62a02f120"),
  sitePpe: IMG("1694521787799-ad4ad241cb39"),
  gloves: IMG("1621905251918-48416bd8575a"),
  drillWhite: IMG("1572981779307-38b8cabb2407"),
  drillConcrete: IMG("1504148455328-c376907d081c"),
  grinderWood: IMG("1518709414768-a88981a4515d"),
  toolWall: IMG("1530124566582-a618bc2615dc"),
  handTools: IMG("1582571881821-380713f48b29"),
  toolKit: IMG("1546827209-a218e99fdbe9"),
  workshop: IMG("1530191601183-4de2969575ad"),
  cables: IMG("1625276254563-f0fbbf66a5e7"),
  outlet: IMG("1557516300-46e218a6961f"),
  wires: IMG("1584809923235-fabdba83d1df"),
  circuit: IMG("1581092918056-0c4c3acd3789"),
  bearingBlue: IMG("1643933871541-090062935680"),
  bearingWhite: IMG("1589391349202-900abe66462a"),
  steelBalls: IMG("1683308743837-e6ba8cdeb60a"),
  yStrainer: IMG("1655369424135-d95267d6bb8c"),
  pvcValve: IMG("1639600993675-2281b2c939f0"),
  gateValve: IMG("1696154994502-93dd97495a4f"),
  fittings: IMG("1642797735471-3e90055c5ff9"),
  pvcSet: IMG("1556995378-e0a5c979ec57"),
  brassFittings: IMG("1589870446935-ce8bc41685b8"),
  grinding: IMG("1564182872950-978e194a05cd"),
  welding: IMG("1504917595217-d4dc5ebe6122"),
  weldSparks: IMG("1564182842519-8a3b2af3e228"),
  spoolRack: IMG("1599256871679-6a154745680b"),
  crates: IMG("1586528116311-ad8dd3c8310d"),
  cartons: IMG("1595246140625-573b715d11dc"),
  sparkGrind: IMG("1564182998523-6923112e7d6b"),
  metalwork: IMG("1558618666-fcd25c85cd64"),
  blueprint: IMG("1581092160562-40aa08e78837"),
};

/* -------------------------------------------------------------- categories */
const categories = [
  ["ppe-safety", "PPE & Safety", "Helmets, eye protection, gloves and everyday site safety essentials.", IMAGES.goggles],
  ["tools-hardware", "Tools & Hardware", "Power tools, hand tools and workshop equipment built for daily use.", IMAGES.toolWall],
  ["electrical-lighting", "Electrical & Lighting", "Cables, wiring accessories, control components and industrial lighting.", IMAGES.cables],
  ["bearings-transmission", "Bearings & Transmission", "Bearings, belts and power transmission components held in stock.", IMAGES.bearingBlue],
  ["pipes-valves", "Pipes, Valves & Fittings", "Pipework, valves, strainers and plumbing components.", IMAGES.fittings],
  ["abrasives-welding", "Abrasives & Welding", "Cutting, grinding and welding consumables for fabrication work.", IMAGES.welding],
  ["material-handling", "Material Handling", "Crates, shelving and storage equipment for warehouse operations.", IMAGES.crates],
  ["fasteners-fixings", "Fasteners & Fixings", "Bolts, nuts, washers and brass fittings in trade quantities.", IMAGES.brassFittings],
];

/* ------------------------------------------------------------------ brands */
const brands = [
  ["nordkraft", "Nordkraft"],
  ["vectra-industrial", "Vectra Industrial"],
  ["titan-pro", "Titan Pro"],
  ["steelcore", "Steelcore"],
  ["voltedge", "VoltEdge"],
  ["greenguard", "GreenGuard"],
];

/* ---------------------------------------------------------------- products */
// [title, sku, hsn, categorySlug, brandSlug, mrp, distributorPrice, bulkSlabs, gst, stock, moq, unit, featured, images, specs, shortDescription]
const products = [
  [
    "Industrial Safety Helmet with Ratchet Suspension",
    "PPE-1001", "650610", "ppe-safety", "greenguard",
    420, 315, [[50, 295], [100, 272]], 18, 480, 10, "per piece", true,
    [IMAGES.helmet, IMAGES.sitePpe, IMAGES.goggles],
    [["Material", "HDPE shell"], ["Suspension", "6-point ratchet"], ["Standard", "IS 2925"], ["Weight", "385 g"], ["Colour", "Yellow"]],
    "High-density polyethylene shell with a six-point ratchet harness for all-day site wear.",
  ],
  [
    "Anti-Fog Safety Goggles (Clear Lens)",
    "PPE-1002", "900490", "ppe-safety", "greenguard",
    260, 185, [[100, 168], [250, 152]], 18, 620, 20, "per piece", false,
    [IMAGES.goggles, IMAGES.helmet, IMAGES.gloves],
    [["Lens", "Polycarbonate, anti-fog"], ["Lens type", "Clear"], ["Frame", "Soft PVC"], ["Ventilation", "Indirect"], ["Pack", "Single unit"]],
    "Impact-resistant polycarbonate lens with indirect ventilation for dusty workshop conditions.",
  ],
  [
    "Site Safety Kit — Helmet, Goggles & Hi-Vis Vest",
    "PPE-1003", "650610", "ppe-safety", "greenguard",
    1150, 860, [[25, 810], [60, 760]], 18, 140, 5, "per kit", true,
    [IMAGES.sitePpe, IMAGES.helmet, IMAGES.goggles],
    [["Kit contents", "Helmet, goggles, vest"], ["Vest", "Mesh, high visibility"], ["Helmet standard", "IS 2925"], ["Best for", "Site onboarding"]],
    "Everything a new site worker needs to be compliant on day one, supplied as one kit.",
  ],
  [
    "Cut-Resistant Work Gloves (Pair)",
    "PPE-1004", "611610", "ppe-safety", "greenguard",
    180, 128, [[200, 115], [500, 102]], 12, 900, 24, "per pair", false,
    [IMAGES.gloves, IMAGES.metalwork, IMAGES.goggles],
    [["Cut level", "ANSI A4"], ["Coating", "PU palm"], ["Liner", "HPPE blend"], ["Sizes", "M / L / XL"], ["Sold as", "Pair"]],
    "PU-coated HPPE liner for handling sharp sheet, strip and glass.",
  ],
  [
    "18V Cordless Hammer Drill (2 Batteries)",
    "TLS-2004", "846721", "tools-hardware", "titan-pro",
    3900, 3250, [[20, 3050], [50, 2890]], 18, 120, 5, "per piece", true,
    [IMAGES.drillWhite, IMAGES.drillConcrete, IMAGES.toolKit],
    [["Voltage", "18 V"], ["Chuck", "13 mm keyless"], ["Torque", "55 Nm"], ["Battery", "2 x 2.0 Ah Li-ion"], ["Modes", "Drill / hammer / screw"]],
    "Two-speed hammer drill supplied with two batteries and a fast charger.",
  ],
  [
    "Rotary Hammer Drill 800W SDS-Plus",
    "TLS-2011", "846721", "tools-hardware", "titan-pro",
    3900, 3250, [[20, 3080], [50, 2920]], 18, 78, 5, "per piece", false,
    [IMAGES.drillConcrete, IMAGES.drillWhite, IMAGES.handTools],
    [["Power", "800 W"], ["Impact energy", "2.7 J"], ["Chuck", "SDS-Plus"], ["Speed", "0–900 rpm"]],
    "SDS-Plus rotary hammer for concrete anchoring and channel cutting.",
  ],
  [
    "850W Angle Grinder 100mm",
    "TLS-2005", "846729", "tools-hardware", "titan-pro",
    2450, 1960, [[15, 1860], [40, 1740]], 18, 210, 4, "per piece", true,
    [IMAGES.grinderWood, IMAGES.sparkGrind, IMAGES.grinding],
    [["Power", "850 W"], ["Disc size", "100 mm"], ["No-load speed", "11,000 rpm"], ["Spindle", "M10"], ["Weight", "1.9 kg"]],
    "Compact 100 mm grinder with a sealed switch and metal gear housing.",
  ],
  [
    "24-Piece Combination Spanner Set (Chrome Vanadium)",
    "TLS-2006", "820411", "tools-hardware", "steelcore",
    1890, 1420, [[10, 1350], [25, 1270]], 18, 95, 2, "per set", false,
    [IMAGES.toolWall, IMAGES.handTools, IMAGES.toolKit],
    [["Pieces", "24"], ["Range", "6–32 mm"], ["Material", "Chrome vanadium"], ["Finish", "Mirror polished"], ["Case", "Roll-up pouch"]],
    "Full metric range in hardened chrome vanadium with a mirrored finish.",
  ],
  [
    "Workshop Hand Tool Kit (68 Pieces)",
    "TLS-2007", "820559", "tools-hardware", "steelcore",
    5600, 4350, [[10, 4150], [25, 3920]], 18, 60, 2, "per kit", true,
    [IMAGES.handTools, IMAGES.toolWall, IMAGES.workshop],
    [["Pieces", "68"], ["Contents", "Sockets, pliers, drivers, hex keys"], ["Material", "CrV / S2 steel"], ["Storage", "Blow-mould case"]],
    "A single case covering general maintenance and assembly work.",
  ],
  [
    "Cordless Power Tool Combo Kit (3 Pieces)",
    "TLS-2008", "846721", "tools-hardware", "titan-pro",
    12900, 10450, [[5, 9950], [12, 9400]], 18, 34, 1, "per kit", false,
    [IMAGES.toolKit, IMAGES.drillWhite, IMAGES.drillConcrete],
    [["Includes", "Drill, impact driver, grinder"], ["Batteries", "2 x 4.0 Ah"], ["Case", "Stackable case"], ["Warranty", "12 months"]],
    "Three cordless tools sharing one battery platform and charger.",
  ],
  [
    "Precision Toolmaker Bench Vice 100mm",
    "TLS-2010", "846620", "tools-hardware", "steelcore",
    3400, 2680, [[10, 2550]], 18, 48, 2, "per piece", false,
    [IMAGES.workshop, IMAGES.handTools, IMAGES.toolWall],
    [["Jaw width", "100 mm"], ["Jaw opening", "110 mm"], ["Body", "Ductile iron"], ["Base", "Swivel"]],
    "Swivel base vice with hardened, ground jaws for precise clamping.",
  ],
  [
    "Flexible Copper Cable 2.5 sq mm — 90 m Coil",
    "ELC-3102", "854449", "electrical-lighting", "voltedge",
    2600, 2080, [[10, 1980], [30, 1870]], 18, 300, 5, "per coil", true,
    [IMAGES.cables, IMAGES.wires, IMAGES.outlet],
    [["Conductor", "Copper, stranded"], ["Size", "2.5 sq mm"], ["Cores", "1"], ["Length", "90 m"], ["Insulation", "PVC FR"]],
    "Flame-retardant PVC insulated copper cable for panel and lighting circuits.",
  ],
  [
    "Modular Switch & Socket Kit (10 Points)",
    "ELC-3103", "853669", "electrical-lighting", "voltedge",
    1450, 1080, [[25, 1020], [60, 960]], 18, 260, 10, "per kit", false,
    [IMAGES.outlet, IMAGES.cables, IMAGES.circuit],
    [["Points", "10"], ["Rating", "6 A / 16 A"], ["Modules", "Switch, socket, indicator"], ["Plate", "Polycarbonate"]],
    "Modular wiring accessories for shop-floor and office fit-outs.",
  ],
  [
    "Multicore Control Cable 1.5 sq mm — 100 m",
    "ELC-3104", "854449", "electrical-lighting", "voltedge",
    3150, 2520, [[10, 2400]], 18, 180, 5, "per coil", false,
    [IMAGES.wires, IMAGES.cables, IMAGES.circuit],
    [["Cores", "4"], ["Size", "1.5 sq mm"], ["Length", "100 m"], ["Screen", "Unscreened"], ["Use", "Control & signal"]],
    "Four-core PVC control cable for machine signalling and panel wiring.",
  ],
  [
    "Industrial Control Component Kit",
    "ELC-3105", "853690", "electrical-lighting", "vectra-industrial",
    5600, 4750, [[10, 4450], [25, 4180]], 18, 85, 3, "per kit", false,
    [IMAGES.circuit, IMAGES.outlet, IMAGES.wires],
    [["Contents", "Terminals, relays, fuses"], ["Rating", "Up to 32 A"], ["Mounting", "DIN rail"], ["Case", "Compartment box"]],
    "Panel-build consumables grouped into one replenishment kit.",
  ],
  [
    "LED Industrial High Bay Light 150W",
    "ELC-3106", "940540", "electrical-lighting", "voltedge",
    4300, 3280, [[15, 3150], [40, 2980]], 18, 140, 4, "per piece", false,
    [IMAGES.workshop, IMAGES.circuit, IMAGES.cables],
    [["Power", "150 W"], ["Output", "19,500 lm"], ["Beam", "120°"], ["Rating", "IP65"], ["Input", "AC 100–265 V"]],
    "High-output IP65 high bay for sheds and fabrication bays.",
  ],
  [
    "Tapered Roller Bearing 30205",
    "BRG-6204", "848220", "bearings-transmission", "nordkraft",
    780, 560, [[50, 520], [150, 478]], 18, 520, 10, "per piece", true,
    [IMAGES.bearingBlue, IMAGES.bearingWhite, IMAGES.steelBalls],
    [["Bore", "25 mm"], ["Outer Ø", "52 mm"], ["Width", "16.25 mm"], ["Type", "Tapered roller"], ["Cage", "Steel"]],
    "Single-row tapered roller bearing for combined radial and axial loads.",
  ],
  [
    "Deep Groove Ball Bearing 6204-2RS",
    "BRG-6205", "848210", "bearings-transmission", "nordkraft",
    340, 238, [[100, 218], [300, 196]], 18, 1200, 25, "per piece", false,
    [IMAGES.bearingWhite, IMAGES.bearingBlue, IMAGES.steelBalls],
    [["Bore", "20 mm"], ["Outer Ø", "47 mm"], ["Width", "14 mm"], ["Seal", "2RS contact seal"], ["Speed", "9,000 rpm"]],
    "Sealed deep groove bearing for electric motors and pumps.",
  ],
  [
    "Chrome Steel Grinding Media Balls 25 mm",
    "BRG-6206", "848291", "bearings-transmission", "steelcore",
    42, 28, [[1000, 24], [5000, 21]], 18, 25000, 500, "per piece", false,
    [IMAGES.steelBalls, IMAGES.bearingBlue, IMAGES.bearingWhite],
    [["Diameter", "25 mm"], ["Material", "Chrome steel GCr15"], ["Hardness", "60–66 HRC"], ["Tolerance", "Grade 10"], ["Sold as", "Individual balls"]],
    "Hardened chrome steel media for mills and ball-mill linings.",
  ],
  [
    "SS316 Y-Type Strainer 50 mm",
    "PFS-4001", "848180", "pipes-valves", "vectra-industrial",
    4900, 3780, [[5, 3650], [15, 3480]], 18, 70, 2, "per piece", true,
    [IMAGES.yStrainer, IMAGES.fittings, IMAGES.yStrainer],
    [["Size", "50 mm"], ["Body", "SS316"], ["Screen", "20 mesh"], ["Connection", "Threaded BSP"], ["Pressure", "PN16"]],
    "Stainless strainer protecting pumps and valves from line debris.",
  ],
  [
    "PVC Ball Valve 1 inch",
    "PFS-4002", "848180", "pipes-valves", "nordkraft",
    320, 224, [[50, 208], [200, 188]], 18, 850, 20, "per piece", false,
    [IMAGES.pvcValve, IMAGES.pvcSet, IMAGES.fittings],
    [["Size", "1 inch"], ["Body", "uPVC"], ["Seals", "EPDM"], ["Connection", "Solvent weld"], ["Pressure", "PN10"]],
    "Corrosion-free isolation valve for water and chemical lines.",
  ],
  [
    "Cast Iron Gate Valve 65 mm",
    "PFS-4003", "848180", "pipes-valves", "vectra-industrial",
    3600, 2820, [[5, 2700]], 18, 65, 2, "per piece", false,
    [IMAGES.gateValve, IMAGES.fittings, IMAGES.pvcSet],
    [["Size", "65 mm"], ["Body", "Cast iron"], ["Trim", "Brass"], ["Connection", "Flanged"], ["Pressure", "PN10"]],
    "Flanged gate valve for isolation duty on water mains and process lines.",
  ],
  [
    "Pipe Fittings & Valves Assortment",
    "PFS-4004", "730719", "pipes-valves", "nordkraft",
    8200, 6400, [[5, 6100], [20, 5750]], 18, 42, 2, "per lot", false,
    [IMAGES.fittings, IMAGES.gateValve, IMAGES.yStrainer],
    [["Contents", "Elbows, tees, nipples, unions"], ["Sizes", "15–50 mm"], ["Material", "Mild steel"], ["Finish", "Galvanised"]],
    "Mixed galvanised fittings and valves for maintenance stores.",
  ],
  [
    "PVC Valve &amp; Fitting Set (12 Pieces)",
    "PFS-4005", "391740", "pipes-valves", "nordkraft",
    1650, 1180, [[20, 1105], [60, 1040]], 18, 130, 5, "per set", false,
    [IMAGES.pvcSet, IMAGES.pvcValve, IMAGES.fittings],
    [["Pieces", "12"], ["Material", "uPVC"], ["Sizes", "1/2 to 1 inch"], ["Use", "Water lines"]],
    "Ready-to-fit set of uPVC valves, elbows and connectors.",
  ],
  [
    "Grinding Disc 100 mm (Pack of 25)",
    "ABR-5001", "680530", "abrasives-welding", "steelcore",
    1450, 980, [[20, 915], [60, 860]], 18, 420, 5, "per pack", true,
    [IMAGES.grinding, IMAGES.sparkGrind, IMAGES.welding],
    [["Diameter", "100 mm"], ["Thickness", "6 mm"], ["Bore", "16 mm"], ["Grain", "Aluminium oxide"], ["Pack", "25 discs"]],
    "Depressed-centre grinding discs for steel and stainless fabrication.",
  ],
  [
    "Welding Electrodes E6013 3.15 mm (5 kg)",
    "ABR-5002", "831110", "abrasives-welding", "steelcore",
    1180, 845, [[25, 790], [80, 735]], 18, 350, 5, "per pack", false,
    [IMAGES.welding, IMAGES.grinding, IMAGES.weldSparks],
    [["Class", "E6013"], ["Diameter", "3.15 mm"], ["Weight", "5 kg"], ["Current", "90–140 A"], ["Coating", "Rutile"]],
    "General-purpose rutile electrodes for smooth bead appearance.",
  ],
  [
    "Cutting Wheel 4 inch (Pack of 50)",
    "ABR-5003", "680530", "abrasives-welding", "steelcore",
    1680, 1140, [[20, 1075], [60, 1010]], 18, 380, 5, "per pack", false,
    [IMAGES.sparkGrind, IMAGES.grinding, IMAGES.weldSparks],
    [["Diameter", "100 mm"], ["Thickness", "1 mm"], ["Bore", "16 mm"], ["Max speed", "15,300 rpm"], ["Pack", "50 wheels"]],
    "Thin cutting wheels for fast, low-burr cuts on thin section.",
  ],
  [
    "Inverter Welding Machine 200A",
    "ABR-5004", "851539", "abrasives-welding", "vectra-industrial",
    18900, 15600, [[3, 14900], [10, 14100]], 18, 22, 1, "per piece", true,
    [IMAGES.metalwork, IMAGES.welding, IMAGES.weldSparks],
    [["Output", "200 A"], ["Input", "AC 220 V"], ["Duty cycle", "60% @ 200 A"], ["Electrode", "1.6–4.0 mm"], ["Weight", "6.4 kg"]],
    "Portable inverter welder with stable arc on site power.",
  ],
  [
    "Stackable Storage Crate 600 x 400 mm",
    "WH-4020", "392310", "material-handling", "nordkraft",
    260, 178, [[100, 165], [400, 148]], 18, 1400, 25, "per piece", true,
    [IMAGES.crates, IMAGES.spoolRack, IMAGES.cartons],
    [["Size", "600 x 400 x 300 mm"], ["Material", "PP copolymer"], ["Load", "30 kg"], ["Stacking", "With lid or nested"], ["Colour", "Grey"]],
    "Heavy-duty crate sized to standard pallet footprints and shelving.",
  ],
  [
    "Heavy-Duty Warehouse Shelving Bay",
    "WH-4021", "730890", "material-handling", "nordkraft",
    14500, 11200, [[5, 10600], [15, 9950]], 18, 26, 1, "per bay", false,
    [IMAGES.workshop, IMAGES.crates, IMAGES.spoolRack],
    [["Levels", "5"], ["Load per level", "350 kg"], ["Height", "3,000 mm"], ["Finish", "Powder coated"], ["Assembly", "Boltless"]],
    "Boltless racking bay with adjustable beams and powder-coated finish.",
  ],
  [
    "Industrial Cable &amp; Hose Spool Rack",
    "WH-4022", "730890", "material-handling", "steelcore",
    6800, 5150, [[5, 4900]], 18, 38, 2, "per piece", false,
    [IMAGES.spoolRack, IMAGES.crates, IMAGES.cables],
    [["Capacity", "6 spools"], ["Load", "400 kg"], ["Width", "1,200 mm"], ["Finish", "Powder coated"]],
    "Keeps cable and hose drums off the floor and easy to pull.",
  ],
  [
    "Shipping &amp; Packing Carton Bundle (50)",
    "WH-4023", "481910", "material-handling", "nordkraft",
    1950, 1420, [[10, 1350], [40, 1275]], 12, 220, 5, "per bundle", false,
    [IMAGES.cartons, IMAGES.crates, IMAGES.spoolRack],
    [["Pieces", "50"], ["Ply", "5 ply"], ["Size", "600 x 400 x 400 mm"], ["Bursting", "18 kg/cm²"], ["Recyclable", "Yes"]],
    "Five-ply export cartons that handle a full shift of packing.",
  ],
  [
    "Brass Compression Fitting Set",
    "FST-6001", "741220", "fasteners-fixings", "nordkraft",
    2350, 1720, [[10, 1620], [40, 1520]], 18, 160, 5, "per set", false,
    [IMAGES.brassFittings, IMAGES.fittings, IMAGES.yStrainer],
    [["Pieces", "20"], ["Material", "Brass CW617N"], ["Sizes", "6–16 mm"], ["Type", "Compression"], ["Use", "Pneumatic lines"]],
    "Leak-tight brass compression fittings for pneumatic tubing.",
  ],
  [
    "Hex Bolt &amp; Nut Assortment M6–M12",
    "FST-6002", "731815", "fasteners-fixings", "steelcore",
    1890, 1340, [[25, 1265], [100, 1180]], 18, 240, 10, "per box", false,
    [IMAGES.fittings, IMAGES.brassFittings, IMAGES.toolWall],
    [["Sizes", "M6–M12"], ["Grade", "8.8 HT"], ["Finish", "Zinc plated"], ["Contents", "Bolts, nuts, washers"], ["Storage", "Compartment box"]],
    "Grade 8.8 high-tensile fasteners sorted into a compartment box.",
  ],
  [
    "Stainless Steel Washer Pack (1,000 Pieces)",
    "FST-6003", "731822", "fasteners-fixings", "steelcore",
    890, 640, [[50, 600], [200, 558]], 18, 310, 10, "per pack", false,
    [IMAGES.bearingWhite, IMAGES.fittings, IMAGES.brassFittings],
    [["Pieces", "1,000"], ["Material", "SS304"], ["Size", "M8"], ["Type", "Plain washer"], ["Finish", "Passivated"]],
    "SS304 washers for outdoor and wash-down environments.",
  ],
  [
    "Copper Lug &amp; Terminal Kit",
    "ELC-3107", "853890", "electrical-lighting", "voltedge",
    2450, 1830, [[10, 1740], [30, 1640]], 18, 120, 5, "per kit", false,
    [IMAGES.circuit, IMAGES.outlet, IMAGES.wires],
    [["Contents", "Lugs, ferrules, heat shrink"], ["Sizes", "1.5–25 sq mm"], ["Material", "Electrolytic copper"], ["Coating", "Tin plated"]],
    "Tin-plated copper lugs and ferrules for panel terminations.",
  ],
  [
    "Abrasive Flap Disc 100 mm (Pack of 10)",
    "ABR-5005", "680530", "abrasives-welding", "steelcore",
    1290, 890, [[20, 830], [60, 780]], 18, 460, 5, "per pack", false,
    [IMAGES.sparkGrind, IMAGES.grinding, IMAGES.welding],
    [["Diameter", "100 mm"], ["Grit", "60"], ["Type", "Conical flap disc"], ["Bore", "16 mm"], ["Pack", "10 discs"]],
    "Long-life flap discs for blending and weld dressing.",
  ],
];

/* -------------------------------------------------------------- connect db */
await mongoose.connect(uri);

const CategorySchema = new mongoose.Schema({ name: String, slug: { type: String, unique: true }, parentId: { type: mongoose.Schema.Types.ObjectId, default: null }, description: String, image: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
const BrandSchema = new mongoose.Schema({ name: String, slug: { type: String, unique: true }, logo: String }, { timestamps: true });
const ProductSchema = new mongoose.Schema({ title: String, slug: { type: String, unique: true }, sku: { type: String, unique: true }, hsnCode: String, categoryId: mongoose.Schema.Types.ObjectId, brandId: mongoose.Schema.Types.ObjectId, type: { type: String, default: "product" }, description: String, shortDescription: String, specifications: [{ key: String, value: String }], images: [String], stock: Number, moq: Number, unit: String, price: { mrp: Number, distributorPrice: Number, bulkSlabs: [{ minQty: Number, price: Number }] }, gstPercent: Number, featured: { type: Boolean, default: false }, isActive: { type: Boolean, default: true } }, { timestamps: true });
const OrderSchema = new mongoose.Schema({ orderNumber: { type: String, unique: true }, idempotencyKey: { type: String, unique: true, sparse: true }, customerEmail: String, contactName: String, contactPhone: String, companyName: String, gstin: String, items: [{ productId: mongoose.Schema.Types.ObjectId, title: String, sku: String, hsnCode: String, unit: String, qty: Number, price: Number, gstPercent: Number, gst: Number, lineTotal: Number, image: String }], billingAddress: { label: String, line1: String, line2: String, city: String, state: String, pincode: String, country: String }, shippingAddress: { label: String, line1: String, line2: String, city: String, state: String, pincode: String, country: String }, subtotal: Number, gstTotal: Number, deliveryCharge: Number, grandTotal: Number, paymentMethod: { type: String, default: "enquiry" }, paymentStatus: { type: String, default: "not_applicable" }, orderStatus: { type: String, default: "new" }, statusHistory: [{ status: String, at: Date, by: String, note: String }], trackingNumber: String, courier: String, notes: String, adminNote: String }, { timestamps: true });
const InquirySchema = new mongoose.Schema({ guestName: String, guestEmail: { type: String, required: true }, guestPhone: String, guestCompany: String, guestGstin: String, productId: mongoose.Schema.Types.ObjectId, productTitle: String, productSku: String, quantity: Number, message: String, inquiryNumber: { type: String, unique: true, sparse: true }, status: { type: String, default: "new" }, quoteAmount: Number, adminNote: String, statusHistory: [{ status: String, at: Date, by: String, note: String }] }, { timestamps: true });
const BookingSchema = new mongoose.Schema({ bookingNumber: { type: String, unique: true, sparse: true }, serviceType: String, customerName: String, email: String, phone: String, companyName: String, date: String, slot: String, notes: String, status: { type: String, default: "booked" }, statusHistory: [{ status: String, at: Date, by: String, note: String }], adminNote: String }, { timestamps: true });
const UserSchema = new mongoose.Schema({ name: String, email: { type: String, unique: true, lowercase: true }, password: String, role: { type: String, default: "customer" }, companyName: String, gstin: String, phone: String }, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
const Brand = mongoose.models.Brand || mongoose.model("Brand", BrandSchema);
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
const Inquiry = mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);
const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const slugify = (s) =>
  String(s).toLowerCase().replace(/&amp;/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const unescape = (s) => String(s).replace(/&amp;/g, "&");

/* ----------------------------------------------------------------- seeding */
const catIds = {};
for (const [slug, name, description, image] of categories) {
  const doc = await Category.findOneAndUpdate(
    { slug },
    { $set: { name, slug, description, image, isActive: true } },
    { upsert: true, new: true }
  );
  catIds[slug] = doc._id;
}

const brandIds = {};
for (const [slug, name] of brands) {
  const doc = await Brand.findOneAndUpdate({ slug }, { $set: { name, slug } }, { upsert: true, new: true });
  brandIds[slug] = doc._id;
}

let productCount = 0;
const productIds = {};
for (const row of products) {
  const [title, sku, hsnCode, catSlug, brandSlug, mrp, distributorPrice, bulkSlabs, gstPercent, stock, moq, unit, featured, images, specs, shortDescription] = row;
  const cleanTitle = unescape(title);
  const doc = await Product.findOneAndUpdate(
    { sku },
    {
      $set: {
        title: cleanTitle,
        slug: slugify(cleanTitle),
        sku,
        hsnCode,
        categoryId: catIds[catSlug],
        brandId: brandIds[brandSlug],
        type: "product",
        shortDescription: unescape(shortDescription),
        description: unescape(shortDescription),
        specifications: specs.map(([key, value]) => ({ key, value })),
        images,
        stock,
        moq,
        unit,
        price: {
          mrp,
          distributorPrice,
          bulkSlabs: bulkSlabs.map(([minQty, price]) => ({ minQty, price })),
        },
        gstPercent,
        featured,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );
  productIds[sku] = doc._id;
  productCount++;
}

console.log(`Seeded ${categories.length} categories, ${brands.length} brands, ${productCount} products.`);

/* ------------------------------------------------------- default admin ----- */
const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "";
const adminHash = (process.env.ADMIN_PASSWORD_HASH || "").trim();

if (!adminEmail || (!adminHash && adminPassword.length < 8)) {
  console.log(
    "Skipped default administrator: set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters, or ADMIN_PASSWORD_HASH) in .env.local."
  );
} else if ((await User.countDocuments({ role: "admin" })) > 0) {
  console.log("An administrator already exists — left untouched.");
} else {
  const password = adminHash || (await bcrypt.hash(adminPassword, 10));
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    existing.role = "admin";
    await existing.save();
    console.log(`Promoted ${adminEmail} to administrator.`);
  } else {
    await User.create({ name: "Administrator", email: adminEmail, password, role: "admin" });
    console.log(`Created default administrator ${adminEmail}.`);
  }
}

/* ------------------------------------------------------------------- demo */
if (withDemo) {
  const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const line = (sku, qty) => {
    const p = products.find((r) => r[1] === sku);
    const [, , hsnCode, , , , dp, slabs, gstPercent, , , unit, , images] = p;
    const slab = [...slabs].reverse().find(([minQty]) => qty >= minQty);
    const price = slab ? slab[1] : dp;
    const lineTotal = price * qty;
    const gst = (lineTotal * gstPercent) / 100;
    return {
      productId: productIds[sku],
      title: unescape(p[0]),
      sku,
      hsnCode,
      unit,
      qty,
      price,
      gstPercent,
      gst,
      lineTotal,
      image: images[0],
    };
  };

  const demoOrders = [
    {
      orderNumber: "NGZ-24011801", idempotencyKey: "seed-1",
      contactName: "Ramesh Iyer", customerEmail: "ramesh@shaktifabrication.example", contactPhone: "+91 98200 41122",
      companyName: "Shakti Fabrication Works", gstin: "27AABCS1429P1ZV",
      items: [line("TLS-2005", 24), line("ABR-5001", 60)],
      billingAddress: { line1: "Plot 42, MIDC Industrial Area", line2: "Bhosari", city: "Pune", state: "Maharashtra", pincode: "411026", country: "India" },
      shippingAddress: { line1: "Gate 3, MIDC Industrial Area", line2: "Bhosari", city: "Pune", state: "Maharashtra", pincode: "411026", country: "India" },
      paymentMethod: "enquiry", orderStatus: "delivered",
      createdAt: daysAgo(9), conversation: true,
    },
    {
      orderNumber: "NGZ-24011902", idempotencyKey: "seed-2",
      contactName: "Deepa Nair", customerEmail: "deepa.nair@veenaelectricals.example", contactPhone: "+91 99400 77812",
      companyName: "Veena Electricals", gstin: "33AAECV8821L1Z3",
      items: [line("ELC-3102", 30), line("ELC-3107", 12)],
      billingAddress: { line1: "18 Anna Salai", line2: "Guindy", city: "Chennai", state: "Tamil Nadu", pincode: "600032", country: "India" },
      shippingAddress: { line1: "18 Anna Salai", line2: "Guindy", city: "Chennai", state: "Tamil Nadu", pincode: "600032", country: "India" },
      paymentMethod: "enquiry", orderStatus: "shipped", trackingNumber: "SR8841209931", courier: "SafeExpress",
      createdAt: daysAgo(5),
    },
    {
      orderNumber: "NGZ-24012003", idempotencyKey: "seed-3",
      contactName: "Arun Prasad", customerEmail: "arun.prasad@northlineretail.example", contactPhone: "+91 98110 45590",
      companyName: "Northline Retail Fixtures", gstin: "07AACCN5567K1Z9",
      items: [line("WH-4020", 200), line("WH-4023", 20)],
      billingAddress: { line1: "C-14 Okhla Industrial Estate", line2: "Phase II", city: "New Delhi", state: "Delhi", pincode: "110020", country: "India" },
      shippingAddress: { line1: "Warehouse 9, Okhla Phase II", line2: "", city: "New Delhi", state: "Delhi", pincode: "110020", country: "India" },
      paymentMethod: "enquiry", orderStatus: "confirmed",
      createdAt: daysAgo(2),
    },
    {
      orderNumber: "NGZ-24012104", idempotencyKey: "seed-4",
      contactName: "Kavita Deshmukh", customerEmail: "kavita@primesheetmetal.example", contactPhone: "+91 97650 22381",
      companyName: "Prime Sheetmetal Components", gstin: "27AAJCP9021M1ZK",
      items: [line("ABR-5004", 3), line("ABR-5002", 25)],
      billingAddress: { line1: "Gat 118, Chakan Industrial Belt", line2: "", city: "Pune", state: "Maharashtra", pincode: "410501", country: "India" },
      shippingAddress: { line1: "Gat 118, Chakan Industrial Belt", line2: "", city: "Pune", state: "Maharashtra", pincode: "410501", country: "India" },
      paymentMethod: "enquiry", orderStatus: "new",
      createdAt: daysAgo(0.2),
    },
  ];

  for (const o of demoOrders) {
    const subtotal = o.items.reduce((s, i) => s + i.lineTotal, 0);
    const gstTotal = o.items.reduce((s, i) => s + i.gst, 0);
    const deliveryCharge = 0;
    const created = o.createdAt;
    delete o.conversation;
    await Order.findOneAndUpdate(
      { orderNumber: o.orderNumber },
      {
        $set: {
          ...o,
          subtotal: Math.round(subtotal * 100) / 100,
          gstTotal: Math.round(gstTotal * 100) / 100,
          deliveryCharge,
          grandTotal: Math.round((subtotal + gstTotal + deliveryCharge) * 100) / 100,
          statusHistory: [{ status: "new", at: created, by: "system", note: "Order received" }].concat(
            ["pending", "confirmed", "shipped", "delivered"].slice(0, ["new", "pending", "confirmed", "shipped", "delivered", "cancelled"].indexOf(o.orderStatus)).map((s, i) => ({ status: s, at: new Date(created.getTime() + (i + 1) * 36e5 * 8), by: "ops@norgez.example", note: `Marked ${s}` }))
          ),
          createdAt: created,
        },
      },
      { upsert: true, new: true }
    );
  }

  const demoInquiries = [
    {
      inquiryNumber: "ENQ-24011901", guestName: "Sandeep Rao", guestEmail: "sandeep.rao@arclineservices.example", guestPhone: "+91 99001 22345",
      guestCompany: "Arcline Facility Services", productTitle: unescape("Industrial Safety Helmet with Ratchet Suspension"), productSku: "PPE-1001",
      quantity: 250, message: "Need 250 helmets with our logo printed for a new site. Please share bulk rate and lead time.", status: "quoted", quoteAmount: 68000, createdAt: daysAgo(6),
    },
    {
      inquiryNumber: "ENQ-24012002", guestName: "Fatima Sheikh", guestEmail: "f.sheikh@zenithpumps.example", guestPhone: "+91 97400 88123",
      guestCompany: "Zenith Pumps & Systems", productTitle: unescape("Deep Groove Ball Bearing 6204-2RS"), productSku: "BRG-6205",
      quantity: 1000, message: "Annual requirement for service kits. Looking for a rate contract.", status: "contacted", createdAt: daysAgo(3),
    },
    {
      inquiryNumber: "ENQ-24012103", guestName: "Vikram Joshi", guestEmail: "vikram@joshiinteriors.example", guestPhone: "+91 98670 33456",
      guestCompany: "Joshi Interiors", productTitle: unescape("LED Industrial High Bay Light 150W"), productSku: "ELC-3106",
      quantity: 40, message: "For an upcoming warehouse project in Bhiwandi. Please advise GST and delivery.", status: "new", createdAt: daysAgo(0.5),
    },
  ];

  for (const i of demoInquiries) {
    await Inquiry.findOneAndUpdate(
      { inquiryNumber: i.inquiryNumber },
      { $set: { ...i, statusHistory: [{ status: "new", at: i.createdAt, by: "website", note: "Enquiry submitted" }] } },
      { upsert: true, new: true }
    );
  }

  const demoBookings = [
    { bookingNumber: "BKG-24011801", serviceType: "Bulk quotation call", customerName: "Ramesh Iyer", email: "ramesh@shaktifabrication.example", phone: "+91 98200 41122", companyName: "Shakti Fabrication Works", date: daysAgo(-2).toISOString().slice(0, 10), slot: "11:00 – 11:30", notes: "Discuss annual consumables pricing.", status: "confirmed", createdAt: daysAgo(4) },
    { bookingNumber: "BKG-24012002", serviceType: "Site stock audit", customerName: "Deepa Nair", email: "deepa.nair@veenaelectricals.example", phone: "+91 99400 77812", companyName: "Veena Electricals", date: daysAgo(-5).toISOString().slice(0, 10), slot: "15:00 – 16:00", notes: "Review current electrical consumable stock levels.", status: "booked", createdAt: daysAgo(1) },
  ];

  for (const b of demoBookings) {
    await Booking.findOneAndUpdate(
      { bookingNumber: b.bookingNumber },
      { $set: { ...b, statusHistory: [{ status: b.status, at: b.createdAt, by: "website", note: "Booking created" }] } },
      { upsert: true, new: true }
    );
  }

  console.log(`Seeded ${demoOrders.length} demo orders, ${demoInquiries.length} enquiries, ${demoBookings.length} bookings.`);
}

await mongoose.disconnect();

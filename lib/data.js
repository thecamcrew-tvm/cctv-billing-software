export const initialProducts=[
{id:'P001',number:'CCTV-001',name:'4MP IP Bullet Camera',category:'CCTV Cameras',price:4590,gst:18,stock:18},
{id:'P002',number:'NVR-002',name:'8 Channel Network Video Recorder',category:'Recorders',price:12900,gst:18,stock:7},
{id:'P003',number:'CAB-003',name:'Cat6 Cable (100m)',category:'Networking',price:3290,gst:18,stock:24},
{id:'P004',number:'HDD-004',name:'1TB Surveillance Hard Disk',category:'Storage',price:4200,gst:18,stock:15},
{id:'P005',number:'ACC-005',name:'Power Supply 12V 5A',category:'Accessories',price:790,gst:18,stock:35},
{id:'P006',number:'WIFI-006',name:'Dual Band Wi-Fi Router',category:'Networking',price:2490,gst:18,stock:12},
{id:'P007',number:'SVC-007',name:'CCTV Installation Service',category:'Service',price:1500,gst:18,stock:999},
{id:'P008',number:'CAM-008',name:'2MP Indoor Dome Camera',category:'CCTV Cameras',price:2890,gst:18,stock:21}
];
export const initialCustomers=[
{id:'C001',name:'Vettuthura',phone:'9876543210',email:'vettuthura@example.com',address:'Vettuthura, Trivandrum, Kerala',pin:'695521',gstin:''},
{id:'C002',name:'ABC Traders',phone:'9847001234',email:'accounts@abctraders.example',address:'Pothencode, Trivandrum',pin:'695584',gstin:''},
{id:'C003',name:'Global Tech',phone:'9847012345',email:'contact@globaltech.example',address:'Technopark, Trivandrum',pin:'695581',gstin:''},
{id:'C004',name:'Royal Store',phone:'9847023456',email:'royal@example.com',address:'Vizhinjam, Trivandrum',pin:'695521',gstin:''}
];
export const initialInvoices=[
{id:'INV-2026-024',customerId:'C001',customerName:'Vettuthura',date:'2026-11-06',total:25946,status:'Paid',method:'UPI',items:[{number:'CCTV-001',name:'4MP IP Bullet Camera',qty:3,price:4590,gst:18}]},
{id:'INV-2026-023',customerId:'C002',customerName:'ABC Traders',date:'2026-11-05',total:18720,status:'Paid',method:'Cash',items:[{number:'NVR-002',name:'8 Channel Network Video Recorder',qty:1,price:12900,gst:18}]},
{id:'INV-2026-022',customerId:'C003',customerName:'Global Tech',date:'2026-11-03',total:32150,status:'Pending',method:'',items:[{number:'CAB-003',name:'Cat6 Cable (100m)',qty:4,price:3290,gst:18}]},
{id:'INV-2026-021',customerId:'C004',customerName:'Royal Store',date:'2026-11-01',total:12480,status:'Paid',method:'Bank Transfer',items:[{number:'CAM-008',name:'2MP Indoor Dome Camera',qty:3,price:2890,gst:18}]}
];
export const initialSettings={company:'The Cam Crew_TVM',subtitle:'Automation & Security Surveillance',phone:'',email:'',address:'Pothencode & Vizhinjam, Trivandrum, Kerala, India',gstin:'',invoicePrefix:'INV',notes:'Thank you for choosing The Cam Crew_TVM. For support, contact our team.'};
export const currency=n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export const shortCurrency=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
export const niceDate=s=>s?new Date(`${s}T12:00:00`).toLocaleDateString('en-GB').replaceAll('/','-'):'';
export const isoToday=()=>new Date().toLocaleDateString('en-CA');
export const calcItem=x=>{const base=Number(x.qty||0)*Number(x.price||0);return base*(1+Number(x.gst||0)/100)};

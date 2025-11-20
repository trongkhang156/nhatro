const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------- MONGODB -----------------
const MONGODB_URI = "mongodb+srv://nguyentrongkhang15697:khanghai123A@cluster0.zdojyhm.mongodb.net/quanlynhatro?appName=Cluster0";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ----------------- MODELS -----------------
const RoomSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  status: { type: String, default: 'Trống' }
});
const Room = mongoose.model('Room', RoomSchema);

const OccupSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  tenant: String,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Occup = mongoose.model('Occup', OccupSchema);

const InvoiceSchema = new mongoose.Schema({
  code: String,
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomName: String,
  roomPrice: Number,
  elecBegin: Number,
  elecEnd: Number,
  elecUsed: Number,
  elecTotal: Number,
  waterBegin: Number,
  waterEnd: Number,
  waterUsed: Number,
  waterTotal: Number,
  trash: Number,
  wifi: Number,
  otherFee: Number,
  total: Number,
  paid: { type: Boolean, default: false },
  month: Number,
  year: Number,
  createdAt: { type: Date, default: Date.now }
});
const Invoice = mongoose.model('Invoice', InvoiceSchema);

const HistorySchema = new mongoose.Schema({
  action: String,
  info: String,
  createdAt: { type: Date, default: Date.now }
});
const History = mongoose.model('History', HistorySchema);

const SettingsSchema = new mongoose.Schema({
  priceElec: Number,
  priceWater: Number,
  priceTrash: Number,
  priceWifi: Number,
  priceOther: Number
});
const Settings = mongoose.model('Settings', SettingsSchema);

// ----------------- UTILS -----------------

function fmtCurrency(n) { 
    return Number(n).toLocaleString('vi-VN'); 
}

function genCode(roomName, month, year) {
  return `${roomName}-${month.toString().padStart(2, '0')}${year % 100}`;
}

/**
 * Hàm tạo HTML hóa đơn (Lấy từ frontend và chuyển sang backend)
 */
function generateServerInvoiceHtml(invoice, settings) {
    const isPaid = invoice.paid ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN';
    const monthYear = `${invoice.month}/${invoice.year}`;
    const total = fmtCurrency(invoice.total);
    const roomPrice = invoice.roomPrice || (invoice.room?.price || 0);
    
    // Lấy giá dịch vụ từ hóa đơn hoặc từ cài đặt
    const priceElec = invoice.elecTotal / (invoice.elecUsed || 1) || settings.priceElec || 3000;
    const priceWater = invoice.waterTotal / (invoice.waterUsed || 1) || settings.priceWater || 10000;

    return `
      <html>
      <head>
        <title>Hóa đơn ${invoice.code}</title>
        <style>
          body { font-family: Tahoma, sans-serif; font-size: 11px; margin: 0; padding: 0; }
          .invoice-container { width: 300px; margin: 0 auto; padding: 10px; border: 1px dashed #000; }
          .header { text-align: center; margin-bottom: 10px; }
          .header h1 { font-size: 14px; margin: 0; }
          .info-line { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .info-line .label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { padding: 4px 2px; text-align: left; border-bottom: 1px dotted #ddd; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #eee; }
          .status { text-align: center; font-size: 14px; font-weight: bold; margin-top: 10px; padding: 5px; border: 2px solid ${invoice.paid ? 'green' : 'red'}; }
          .note { font-style: italic; font-size: 10px; margin-top: 10px; }
          
          @media print {
              .invoice-container { border: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>PHIẾU THANH TOÁN TIỀN TRỌ</h1>
            <p style="margin: 3px 0;">---------------------</p>
            <p>Kỳ: Tháng ${monthYear}</p>
          </div>
          
          <div style="margin-top: 5px;">
            <div class="info-line"><span class="label">Phòng:</span> <span>${invoice.roomName || (invoice.room?.name || '')}</span></div>
            <div class="info-line"><span class="label">Mã HĐ:</span> <span>${invoice.code}</span></div>
          </div>
          
          <hr style="margin: 8px 0; border-top: 1px dotted #000;"/>
          
          <table>
            <thead>
              <tr><th>Dịch vụ</th><th class="text-right">SL/Đơn giá</th><th class="text-right">Thành tiền (VNĐ)</th></tr>
            </thead>
            <tbody>
              <tr><td>1. Tiền phòng</td><td class="text-right">Phí cố định</td><td class="text-right">${fmtCurrency(roomPrice)}</td></tr>
              <tr><td>2. Tiền điện</td><td class="text-right">${invoice.elecUsed} kWh x ${fmtCurrency(priceElec)}</td><td class="text-right">${fmtCurrency(invoice.elecTotal)}</td></tr>
              <tr><td>3. Tiền nước</td><td class="text-right">${invoice.waterUsed} m³ x ${fmtCurrency(priceWater)}</td><td class="text-right">${fmtCurrency(invoice.waterTotal)}</td></tr>
              <tr><td>4. Phí Wifi</td><td class="text-right">Phí cố định</td><td class="text-right">${fmtCurrency(invoice.wifi)}</td></tr>
              <tr><td>5. Phí Rác</td><td class="text-right">Phí cố định</td><td class="text-right">${fmtCurrency(invoice.trash)}</td></tr>
              ${invoice.otherFee > 0 ? `<tr><td>6. Phí khác</td><td class="text-right">Phát sinh</td><td class="text-right">${fmtCurrency(invoice.otherFee)}</td></tr>` : ''}
            </tbody>
          </table>

          <hr style="margin: 8px 0; border-top: 1px solid #000;"/>

          <div class="info-line total-row" style="font-size: 12px; padding: 3px 0;">
            <span>TỔNG CỘNG:</span>
            <span class="text-right" style="font-size: 14px; color: #d9534f;">${total} VNĐ</span>
          </div>

          <div class="status" style="color: ${invoice.paid ? 'green' : 'red'};">${isPaid}</div>
          
          <p class="note">Xin quý khách kiểm tra kỹ hóa đơn trước khi thanh toán. Cảm ơn!</p>
          
          <div style="margin-top: 15px; display: flex; justify-content: space-around; text-align: center;">
              <div>Người lập phiếu</div>
              <div>Người thuê</div>
          </div>
        </div>
        
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
}

// ----------------- ROUTES -----------------

// ROOMS
app.get('/api/rooms', async (req, res) => {
  const rooms = await Room.find().lean();
  res.json(rooms);
});

app.post('/api/rooms', async (req, res) => {
  const r = new Room(req.body);
  await r.save();
  await History.create({ action: 'Thêm phòng', info: `Phòng ${r.name} (${r.price} VNĐ)` });
  res.json(r);
});

app.delete('/api/rooms/:id', async (req, res) => {
  const room = await Room.findByIdAndDelete(req.params.id);
  if(room) {
    await History.create({ action: 'Xóa phòng', info: `Đã xóa phòng ${room.name}` });
    // Cập nhật trạng thái Occupancy liên quan
    await Occup.updateMany({ room: req.params.id, active: true }, { active: false });
  }
  res.json({ ok: true });
});

// OCCUPANCY
app.get('/api/occupancy', async (req, res) => {
  // Chỉ lấy các mục đang hoạt động (active: true)
  const list = await Occup.find({ active: true }).populate('room').lean();
  res.json(list);
});

app.post('/api/occupancy', async (req, res) => {
  const { roomId, tenant } = req.body;
  const room = await Room.findById(roomId);
  if (!room) return res.status(400).json({ error: 'Room not found' });
  if (room.status === 'Đang thuê') return res.status(400).json({ error: 'Phòng đang thuê' });

  const o = new Occup({ room: roomId, tenant, active: true });
  await o.save();
  await Room.findByIdAndUpdate(roomId, { status: 'Đang thuê' });
  await History.create({ action: 'Thuê phòng', info: `${room.name} cho ${tenant}` });
  res.json(o);
});

app.delete('/api/occupancy/:id', async (req, res) => {
  const o = await Occup.findById(req.params.id).populate('room');
  if (!o) return res.status(404).json({ error: 'Not found' });
  if (!o.active) return res.status(400).json({ error: 'Đã trả phòng' });

  // Tắt cờ active
  o.active = false;
  await o.save();

  // Cập nhật trạng thái phòng
  await Room.findByIdAndUpdate(o.room._id, { status: 'Trống' });
  await History.create({ action: 'Trả phòng', info: `Phòng ${o.room.name} được trả (Người thuê: ${o.tenant})` });
  res.json({ ok: true });
});

// SETTINGS
app.get('/api/settings', async (req, res) => {
  const s = await Settings.findOne().lean() || { priceElec: 3000, priceWater: 10000, priceTrash: 20000, priceWifi: 50000, priceOther: 0 };
  // Đảm bảo luôn trả về object
  res.json(s);
});

app.post('/api/settings', async (req, res) => {
  let s = await Settings.findOne();
  // Sử dụng `upsert` để tạo mới nếu chưa tồn tại
  const updateData = {
    priceElec: req.body.priceElec,
    priceWater: req.body.priceWater,
    priceTrash: req.body.priceTrash,
    priceWifi: req.body.priceWifi,
    priceOther: req.body.priceOther 
  };

  s = await Settings.findOneAndUpdate({}, updateData, { new: true, upsert: true });

  await History.create({ action: 'Cập nhật giá', info: 'Cập nhật giá dịch vụ' });
  res.json(s);
});

// INVOICES
app.get('/api/invoices', async (req, res) => {
  // Sắp xếp theo createdAt mới nhất
  const invs = await Invoice.find().populate('room').sort({ createdAt: -1 }).lean(); 
  res.json(invs);
});

// ** ROUTE ĐỂ IN HÓA ĐƠN (Đã thêm) **
app.get('/api/invoices/print/:id', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        
        // 1. Lấy dữ liệu hóa đơn và populate room
        const invoice = await Invoice.findById(invoiceId).populate('room').lean().exec();
        const settings = await Settings.findOne().lean();
        
        if (!invoice) {
            return res.status(404).set('Content-Type', 'text/html').send('<h1>Không tìm thấy hóa đơn.</h1>');
        }
        
        // 2. Tạo HTML cho hóa đơn bằng hàm tiện ích
        const htmlContent = generateServerInvoiceHtml(invoice, settings); 
        
        // 3. Trả về HTML
        res.set('Content-Type', 'text/html');
        res.send(htmlContent);

    } catch (error) {
        console.error("Lỗi khi tạo HTML hóa đơn:", error);
        res.status(500).set('Content-Type', 'text/html').send('<h1>Lỗi Server khi tạo hóa đơn. Vui lòng kiểm tra log.</h1>');
    }
});


app.post('/api/invoices', async (req, res) => {
  const { invoices: inputInvoices } = req.body; 
  const settings = await Settings.findOne() || {};
  const results = [];

  // Lấy tháng/năm từ item đầu tiên hoặc từ thời gian hiện tại nếu không có
  const month = inputInvoices[0]?.month || (new Date().getMonth() + 1);
  const year = inputInvoices[0]?.year || new Date().getFullYear();

  for (const item of inputInvoices) {
    const room = await Room.findById(item.roomId);
    if (!room) continue;

    // Tính toán dựa trên giá phòng và chỉ số
    const elUsage = item.elecEnd - item.elecBegin;
    const wtUsage = item.waterEnd - item.waterBegin;

    const elPrice = settings.priceElec || 3000;
    const wtPrice = settings.priceWater || 10000;
    const trashFee = settings.priceTrash || 20000;
    const wifiFee = settings.priceWifi || 50000;
    const otherFee = settings.priceOther || 0;

    const elTotal = elUsage * elPrice;
    const wtTotal = wtUsage * wtPrice;

    const total = (room.price || 0) + elTotal + wtTotal + trashFee + wifiFee + otherFee + (item.otherFee || 0);

    const inv = new Invoice({ 
      ...item, 
      room: room._id, // Lưu ObjectId
      roomName: room.name,
      roomPrice: room.price,
      elecUsed: elUsage,
      elecTotal: elTotal,
      waterUsed: wtUsage,
      waterTotal: wtTotal,
      trash: trashFee,
      wifi: wifiFee,
      total, 
      code: genCode(room.name, item.month, item.year), // Sử dụng month/year từ input
      month: item.month, 
      year: item.year 
    });
    await inv.save();
    results.push(inv);
    await History.create({ action: 'Tạo hóa đơn', info: `Phòng ${room.name}, tổng ${total}` });
  }
  res.json(results);
});

// Thanh toán hóa đơn (PUT /api/invoices/:id)
app.put('/api/invoices/:id', async (req, res) => { 
  const inv = await Invoice.findByIdAndUpdate(
    req.params.id, 
    { paid: req.body.paid }, 
    { new: true }
  );
  if (!inv) return res.status(404).json({ error: 'Not found' });
  
  await History.create({ action: 'Thanh toán', info: `${inv.code} được đánh dấu là ${inv.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}` });
  res.json(inv);
});

// Xóa hóa đơn (DELETE /api/invoices/:id)
app.delete('/api/invoices/:id', async (req, res) => {
  const inv = await Invoice.findByIdAndDelete(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  
  await History.create({ action: 'Xóa hóa đơn', info: `Đã xóa hóa đơn ${inv.code}` });
  res.json({ ok: true });
});


// HISTORY
app.get('/api/history', async (req, res) => {
  const logs = await History.find().sort({ createdAt: -1 }).lean();
  res.json(logs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

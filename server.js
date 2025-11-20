// server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); // 👈 Bổ sung CORS

const app = express();
app.use(express.json());
app.use(cors()); // 👈 Kích hoạt CORS cho phép Frontend truy cập
app.use(express.static(path.join(__dirname, 'public'))); // Giả định frontend nằm trong public nếu bạn muốn deploy

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
  roomName: String, // 👈 Thêm trường này để hiển thị trên Frontend
  roomPrice: Number, // 👈 Thêm giá phòng
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
  priceOther: Number // 👈 Đổi priceParking thành priceOther cho khớp Frontend
});
const Settings = mongoose.model('Settings', SettingsSchema);

// ----------------- UTILS -----------------
function genCode(roomName, month, year) {
  return `${roomName}-${month.toString().padStart(2, '0')}${year % 100}`;
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

app.post('/api/invoices', async (req, res) => {
  const { invoices: inputInvoices } = req.body; 
  const settings = await Settings.findOne() || {};
  const results = [];

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

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
      code: genCode(room.name, month, year), 
      month: item.month, // Lấy từ input frontend
      year: item.year    // Lấy từ input frontend
    });
    await inv.save();
    results.push(inv);
    await History.create({ action: 'Tạo hóa đơn', info: `Phòng ${room.name}, tổng ${total}` });
  }
  res.json(results);
});

// Thanh toán hóa đơn (PUT /api/invoices/:id)
// Frontend dùng PUT với body {paid: true}
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

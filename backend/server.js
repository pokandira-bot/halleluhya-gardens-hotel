const http = require('http');
const { URL } = require('url');
const nodemailer = require('nodemailer');

const rooms = [
  { id: 1, name: 'Ocean Suite', price: 280, guests: 2, status: 'Available' },
  { id: 2, name: 'Garden Deluxe', price: 240, guests: 2, status: 'Limited' },
  { id: 3, name: 'Family Residence', price: 410, guests: 4, status: 'Available' },
  { id: 4, name: 'Skyline Loft', price: 330, guests: 2, status: 'Booked' }
];

function generateReceiptNumber() {
  return `HG-${Date.now().toString().slice(-6)}`;
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const diffMs = new Date(checkOut) - new Date(checkIn);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}

function formatKES(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function buildReceiptText(receipt) {
  return [
    'Halleluhya Gardens Booking Receipt',
    '',
    `Receipt Number: ${receipt.receiptNumber}`,
    `Guest: ${receipt.guestName}`,
    `Email: ${receipt.guestEmail}`,
    `Phone Number: ${receipt.phoneNumber || 'Not supplied'}`,
    `Host Email: ${receipt.hostEmail || 'Not supplied'}`,
    `Room: ${receipt.room}`,
    `Check In: ${receipt.checkIn}`,
    `Check Out: ${receipt.checkOut}`,
    `Nights: ${receipt.nights}`,
    `Total: ${formatKES(receipt.total)}`,
    'Payment: Transfer to 0742921888. No reversal.',
    '',
    'Thank you for choosing Halleluhya Gardens. Your booking has been received successfully.',
    `Issued: ${receipt.issuedAt}`
  ].join('\n');
}

function buildReceiptHtml(receipt) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1c1a18;">
      <h2 style="color: #8a5e3b; margin-bottom: 12px;">Halleluhya Gardens</h2>
      <h3 style="margin: 0 0 16px;">Booking Receipt</h3>
      <p><strong>Receipt Number:</strong> ${receipt.receiptNumber}</p>
      <p><strong>Guest:</strong> ${receipt.guestName}</p>
      <p><strong>Email:</strong> ${receipt.guestEmail}</p>
      <p><strong>Phone Number:</strong> ${receipt.phoneNumber || 'Not supplied'}</p>
      <p><strong>Host Email:</strong> ${receipt.hostEmail || 'Not supplied'}</p>
      <p><strong>Room:</strong> ${receipt.room}</p>
      <p><strong>Check In:</strong> ${receipt.checkIn}</p>
      <p><strong>Check Out:</strong> ${receipt.checkOut}</p>
      <p><strong>Nights:</strong> ${receipt.nights}</p>
      <p><strong>Total:</strong> ${formatKES(receipt.total)}</p>
      <p><strong>Payment:</strong> Transfer to 0742921888. No reversal.</p>
      <p style="margin-top: 20px;">Thank you for choosing Halleluhya Gardens. Your booking has been received.</p>
    </div>
  `;
}

async function sendReceiptEmail(booking) {
  const hostEmail = String(process.env.HOST_EMAIL || 'pokandira@gmail.com').trim();
  const guestEmail = hostEmail;
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  const receiptNumber = generateReceiptNumber();
  const total = Number(booking.total || 0);
  const nights = calculateNights(booking.checkIn, booking.checkOut);

  const receipt = {
    receiptNumber,
    guestName: booking.name || 'Guest',
    guestEmail,
    phoneNumber: booking.phoneNumber || '',
    hostEmail,
    room: booking.room || 'Selected room',
    checkIn: booking.checkIn || '',
    checkOut: booking.checkOut || '',
    nights,
    total,
    issuedAt: new Date().toISOString()
  };

  if (!smtpUser || !smtpPass) {
    console.log('[Receipt simulation]');
    console.log('To:', guestEmail);
    if (hostEmail) console.log('Copy to host:', hostEmail);
    console.log(buildReceiptText(receipt));
    return { ...receipt, emailStatus: 'simulated' };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const recipients = [...new Set([guestEmail, ...(hostEmail ? [hostEmail] : [])])].join(', ');

  await transporter.sendMail({
    from: process.env.SMTP_FROM || smtpUser,
    to: recipients,
    subject: `Booking Receipt - ${receipt.room} (${receipt.receiptNumber})`,
    text: buildReceiptText(receipt),
    html: buildReceiptHtml(receipt)
  });

  return { ...receipt, emailStatus: 'sent' };
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (requestUrl.pathname === '/api/rooms' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rooms }));
    return;
  }

  if (requestUrl.pathname === '/api/booking' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const booking = JSON.parse(body || '{}');
        const receipt = await sendReceiptEmail(booking);

        const confirmation = {
          success: true,
          message: 'Booking confirmed. Receipt generated and sent to the host email.',
          receipt,
          booking: {
            guest: booking.name || 'Guest',
            email: booking.email || '',
            phoneNumber: booking.phoneNumber || '',
            hostEmail: process.env.HOST_EMAIL || 'pokandira@gmail.com',
            room: booking.room || 'Selected room',
            checkIn: booking.checkIn || '',
            checkOut: booking.checkOut || '',
            total: Number(booking.total || 0)
          }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(confirmation));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: error.message || 'Invalid booking payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, message: 'Not found' }));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

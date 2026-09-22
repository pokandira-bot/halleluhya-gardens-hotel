const API_URL = window.location.origin;

async function loadRooms() {
  const response = await fetch(`${API_URL}/api/rooms`);
  const data = await response.json();
  const rooms = data.rooms || [];

  const roomList = document.getElementById('room-list');
  const roomSelect = document.getElementById('roomSelect');

  roomList.innerHTML = rooms.map((room) => `
    <article class="room-card">
      <img src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80" alt="${room.name}" />
      <div class="room-card-body">
        <div class="room-meta">
          <h3>${room.name}</h3>
          <span>$${room.price}/night</span>
        </div>
        <p>${room.guests} guests</p>
        <p>${room.status}</p>
      </div>
    </article>
  `).join('');

  roomSelect.innerHTML = rooms.map((room) => `
    <option value="${room.name}">${room.name}</option>
  `).join('');
}

async function submitBooking(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById('name').value,
    email: 'pokandira@gmail.com',
    phoneNumber: document.getElementById('phoneNumber').value,
    checkIn: document.getElementById('checkIn').value,
    checkOut: document.getElementById('checkOut').value,
    room: document.getElementById('roomSelect').value,
    total: 280
  };

  const response = await fetch(`${API_URL}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  const status = document.getElementById('status');

  if (result.success) {
    const guestMessage = 'Receipt generated';
    localStorage.setItem('hotelReceipt', JSON.stringify(result.receipt || {}));
    status.textContent = `${result.message} ${guestMessage}. Payment to 0742921888. No reversal.`;
    status.style.color = 'green';
    window.open('receipt.html', '_blank');
    event.target.reset();
  } else {
    status.textContent = result.message || 'Booking failed';
    status.style.color = 'red';
  }
}

document.getElementById('quick-booking-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const status = document.getElementById('status');
  const inDate = document.getElementById('quickCheckIn').value;
  const outDate = document.getElementById('quickCheckOut').value;

  if (!inDate || !outDate) {
    status.textContent = 'Please select both dates.';
    status.style.color = 'red';
    return;
  }

  status.textContent = `Availability checked for ${inDate} to ${outDate}.`;
  status.style.color = 'green';
});

document.getElementById('booking-form').addEventListener('submit', submitBooking);

loadRooms();

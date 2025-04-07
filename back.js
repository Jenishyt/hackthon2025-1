const statusMessage = document.getElementById('slot-status-message');
const logContainer = document.getElementById('parking-message');
const buyBtn = document.getElementById('buy-btn');
const cancelBtn = document.getElementById('cancel-btn');
const spaceInfo = document.getElementById('space-info');
const qrBox = document.getElementById('qr-box');
let selectedSlot = null;

const state = {
  carSlots: [],
  bikeSlots: [],
  occupied: new Set(),
  manualLogs: []
};

const roadTouchingSlots = new Set([
  'A4','A9','A10','A11','A12','A13','A14',
  'B0','B5','B10','B11','B12','B13','B14',
  'C0','C1','C2','C3','C4','C9','C14','C19','C24','C29',
  'D0','D1','D2','D3','D4','D5','D10','D15','D20','D25'
]);

function updateFreeCounts() {
  const totalCars = 30;
  const totalBikes = 60;
  const occupiedCars = [...state.occupied].filter(id => id.startsWith('A') || id.startsWith('B')).length;
  const occupiedBikes = [...state.occupied].filter(id => id.startsWith('C') || id.startsWith('D')).length;
  spaceInfo.textContent = `${totalBikes - occupiedBikes} bike spaces are available | ${totalCars - occupiedCars} car spaces are available`;
}

function createSlot(block, index) {
  const slot = document.createElement('div');
  slot.className = 'parking-slot';
  const label = `${block}${index}`;
  slot.dataset.label = label;
  slot.textContent = '';
  if (block === 'A' || block === 'B') state.carSlots.push(label);
  else state.bikeSlots.push(label);

  slot.addEventListener('click', () => {
    if (state.occupied.has(label)) {
      statusMessage.textContent = `Slot ${label} is already occupied`;
      return;
    }
    if (selectedSlot && selectedSlot !== slot) {
      selectedSlot.textContent = '';
      selectedSlot.classList.remove('revealed');
      buyBtn.style.display = 'none';
      cancelBtn.style.display = 'none';
    }
    if (!slot.classList.contains('revealed')) {
      slot.textContent = label;
      slot.classList.add('revealed');
      selectedSlot = slot;

      let price = (block === 'A' || block === 'B') ? 49 : 19;
      let surchargeMsg = '';
      if (roadTouchingSlots.has(label)) {
        price = Math.round(price * 1.1);
        surchargeMsg = ' (10% extra for road-connected slot)';
      }
      statusMessage.textContent = `This is position ${label}${surchargeMsg}`;
      buyBtn.style.display = 'block';
      cancelBtn.style.display = 'block';
      buyBtn.textContent = `Book Now @ ₹${price}`;
    }
  });
  return slot;
}

function fillBlock(id, blockLabel, count) {
  const block = document.getElementById(id);
  for (let i = 0; i < count; i++) {
    block.appendChild(createSlot(blockLabel, i));
  }
}

fillBlock('block-a', 'A', 15);
fillBlock('block-b', 'B', 15);
fillBlock('block-c', 'C', 30);
fillBlock('block-d', 'D', 30);
updateFreeCounts();
setInterval(updateFreeCounts, 5000);

function updateManualLogs() {
  logContainer.innerHTML = state.manualLogs.slice(-5).map(label => `<div class="log-message"><strong>${label}</strong> booked</div>`).join('');
}

buyBtn.addEventListener('click', () => {
  if (selectedSlot) {
    const label = selectedSlot.dataset.label;
    selectedSlot.classList.add('occupied', 'booked');
    selectedSlot.textContent = label;
    statusMessage.textContent = `Slot ${label} is now booked`;
    state.occupied.add(label);
    state.manualLogs.push(label);
    selectedSlot = null;
    buyBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    qrBox.style.display = 'block';
    updateManualLogs();
    setTimeout(() => {
      document.querySelectorAll('.parking-slot.booked').forEach(slot => {
        slot.classList.remove('booked');
      });
      qrBox.style.display = 'none';
    }, 3000);
    updateFreeCounts();
  }
});

cancelBtn.addEventListener('click', () => {
  if (selectedSlot) {
    selectedSlot.textContent = '';
    selectedSlot.classList.remove('revealed');
    selectedSlot = null;
    statusMessage.textContent = `Slot selection cancelled.`;
    buyBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }
});

document.getElementById('cheat-btn').addEventListener('click', () => {
  const allSlots = document.querySelectorAll('.parking-slot');
  const slotsToFill = Math.floor(Math.random() * 20) + 10;
  let filled = 0;
  while (filled < slotsToFill) {
    const slot = allSlots[Math.floor(Math.random() * allSlots.length)];
    const label = slot.dataset.label;
    if (!slot.classList.contains('occupied')) {
      slot.classList.add('occupied');
      slot.textContent = label;
      state.occupied.add(label);
      filled++;
    }
  }
  statusMessage.textContent = `Filled ${filled} random slots for demo`;
  updateFreeCounts();
  document.getElementById('cheat-btn').remove();
});

const sensorSlots = ['A4', 'B0', 'C4', 'D0'];

function pollSensorStatus() {
  fetch('http://192.168.156.184/sensor-data') // Replace with real endpoint
    .then(res => res.json())
    .then(data => {
      sensorSlots.forEach(slotId => {
        const slotEl = document.querySelector(`.parking-slot[data-label="${slotId}"]`);
        const isDetected = data[slotId];

        if (isDetected) {
          if (!state.occupied.has(slotId)) {
            slotEl.classList.add('occupied');
            slotEl.textContent = slotId;
            state.occupied.add(slotId);
          }
        } else {
          if (state.occupied.has(slotId)) {
            slotEl.classList.remove('occupied');
            slotEl.textContent = '';
            state.occupied.delete(slotId);
          }
        }
      });
      updateFreeCounts();
    })
    .catch(err => {
      console.error('Sensor fetch error:', err);
    });
}

setInterval(pollSensorStatus, 3000);

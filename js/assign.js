lucide.createIcons();

let selectedCard = null;
let selectedName = null;

function selectInvestigator(card, name) {
     // If there was already a selected card before,
  // remove the 'selected' styling from it this gives a clean slate
  if (selectedCard) selectedCard.classList.remove('selected');
  selectedCard = card;
  selectedName = name;
  card.classList.add('selected');

  document.getElementById('assignPrompt').style.display = 'none';
  document.getElementById('assignBtn').classList.add('visible');
  document.getElementById('assignedMsg').classList.remove('visible');
}

function assignInvestigator() {
  if (!selectedName) return;
  document.getElementById('assignBtn').classList.remove('visible');
  const msg = document.getElementById('assignedMsg');
  msg.textContent = `✓ ${selectedName} assigned to ETD-2026-001`;
  msg.classList.add('visible');
}
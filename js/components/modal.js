function openModal(html, opts = {}){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(overlay);
  if(opts.closeOnOverlay !== false){
    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
  }
  return overlay;
}

function closeModal(el){ el.closest('.modal-overlay')?.remove(); }
// js/modules/uiHandler.js

export const showAlert = (title, message, type = 'info') => {
    return new Promise((resolve) => {
        createModal(title, message, type, false, resolve);
    });
};

export const showConfirm = (title, message) => {
    return new Promise((resolve) => {
        createModal(title, message, 'confirm', true, resolve);
    });
};

const createModal = (title, message, type, isConfirm, resolveCallback) => {
    // Eliminar modal previo si existe
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Colores según el tipo
    let color = '#0A3D62'; // Default (Info)
    if (type === 'error') color = '#E74C3C'; // Rojo
    if (type === 'success') color = '#2ECC71'; // Verde
    if (type === 'confirm') color = '#F39C12'; // Naranja

    let buttons = '';
    if (isConfirm) {
        buttons = `
            <button class="modal-btn cancel" id="modal-cancel" style="background:#ddd; color:#333;">Cancelar</button>
            <button class="modal-btn confirm" id="modal-ok" style="background:${color}; color:white;">Continuar</button>
        `;
    } else {
        buttons = `<button class="modal-btn confirm" id="modal-ok" style="background:${color}; color:white;">Aceptar</button>`;
    }

    overlay.innerHTML = `
        <div class="modal-box" style="background:white; padding:25px; border-radius:8px; max-width:400px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
            <h3 style="color:${color}; margin-top:0;">${title}</h3>
            <p style="color:#555; font-size:1.1em;">${message}</p>
            <div style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
                ${buttons}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Estilos básicos para el overlay (si no usas el CSS separado)
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;";

    const close = (val) => {
        overlay.remove();
        resolveCallback(val);
    };

    document.getElementById('modal-ok').onclick = () => close(true);
    if (isConfirm) document.getElementById('modal-cancel').onclick = () => close(false);
};
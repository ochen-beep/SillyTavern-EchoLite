// @ts-check

let confirmModalResolver = null;
let confirmModalVisible = false;

export function showConfirmModal(message, labels) {
    return new Promise((resolve) => {
        if (confirmModalVisible) {
            resolve(false);
            return;
        }

        confirmModalResolver = resolve;
        confirmModalVisible = true;

        let overlay = document.getElementById('ec_confirm_modal_overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ec_confirm_modal_overlay';
            overlay.className = 'ec_confirm_modal_overlay';
            overlay.innerHTML = `
 <div class="ec_confirm_modal_card">
 <div class="ec_confirm_modal_icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
 <div class="ec_confirm_modal_message" id="ec_confirm_message"></div>
 <div class="ec_confirm_modal_actions">
 <button class="ec_confirm_modal_btn ec_confirm_cancel" id="ec_confirm_cancel">${labels.cancel}</button>
 <button class="ec_confirm_modal_btn ec_confirm_ok" id="ec_confirm_ok">${labels.confirm}</button>
 </div>
 </div>`;
            document.body.appendChild(overlay);

            const cancelBtn = document.getElementById('ec_confirm_cancel');
            const okBtn = document.getElementById('ec_confirm_ok');

            overlay._ecCleanup = () => {
                cancelBtn?.removeEventListener('click', overlay._ecOnCancel);
                okBtn?.removeEventListener('click', overlay._ecOnOk);
                overlay?.removeEventListener('click', overlay._ecOnBackdrop);
            };

            overlay._ecOnCancel = () => closeConfirm(false);
            overlay._ecOnOk = () => closeConfirm(true);
            overlay._ecOnBackdrop = (e) => { if (e.target === overlay) closeConfirm(false); };

            cancelBtn.addEventListener('click', overlay._ecOnCancel);
            okBtn.addEventListener('click', overlay._ecOnOk);
            overlay.addEventListener('click', overlay._ecOnBackdrop);
        } else {
            const cancelBtn = document.getElementById('ec_confirm_cancel');
            const okBtn = document.getElementById('ec_confirm_ok');
            if (cancelBtn) cancelBtn.textContent = labels.cancel;
            if (okBtn) okBtn.textContent = labels.confirm;
        }

        document.getElementById('ec_confirm_message').textContent = message;
        requestAnimationFrame(() => overlay.classList.add('ec_confirm_visible'));
    });
}

function closeConfirm(result) {
    if (!confirmModalVisible) return;
    confirmModalVisible = false;

    const overlay = document.getElementById('ec_confirm_modal_overlay');
    if (overlay) {
        overlay.classList.remove('ec_confirm_visible');
        overlay._ecCleanup?.();
    }

    if (confirmModalResolver) {
        confirmModalResolver(result);
        confirmModalResolver = null;
    }
}

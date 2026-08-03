(function () {
    'use strict';

    var BUTTON_CLASS = 'btn-moe-custom';
    var BUTTON_TEXT  = 'Моё';

    // ─── Добавление кнопки ───────────────────────────────────────────────
    function addButton() {
        // Контейнеры с кнопками в полной карточке Lampa
        var selectors = [
            '.full__buttons',
            '.card__buttons',
            '.item__buttons',
            '.full__btns'
        ];

        selectors.forEach(function (sel) {
            var container = document.querySelector(sel);
            if (!container) return;
            if (container.querySelector('.' + BUTTON_CLASS)) return; // уже есть

            var btn = document.createElement('div');
            btn.className = BUTTON_CLASS + ' full__button btn btn--outline';
            btn.setAttribute('tabindex', '0');
            btn.innerHTML = '<span>' + BUTTON_TEXT + '</span>';

            btn.addEventListener('click', onButtonClick);
            btn.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') onButtonClick();
            });

            container.appendChild(btn);
        });
    }

    // ─── Обработчик нажатия ──────────────────────────────────────────────
    function onButtonClick() {
        if (window.Lampa && Lampa.Modal) {
            Lampa.Modal.open({
                title: BUTTON_TEXT,
                size:  'medium',
                html:  '<div style="padding:1.2em;text-align:center;font-size:1.1em;">'
                     + 'Раздел «Моё» — в разработке.'
                     + '</div>'
            });
        } else {
            alert(BUTTON_TEXT);
        }
    }

    // ─── Инициализация ───────────────────────────────────────────────────
    function init() {
        if (typeof Lampa === 'undefined' || !Lampa.Listener) {
            setTimeout(init, 300);
            return;
        }

        // Подписка на события рендера карточки (несколько вариантов названий)
        var events = ['card_render', 'full_render', 'full_start', 'item_render'];
        events.forEach(function (evt) {
            try { Lampa.Listener.add(evt, addButton); } catch (e) {}
        });

        // Fallback: MutationObserver на случай, если события не сработали
        var debounce = null;
        var observer = new MutationObserver(function () {
            clearTimeout(debounce);
            debounce = setTimeout(addButton, 150);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

(function () {
    'use strict';

    var BTN_CLASS = 'btn-moe-custom';
    var BTN_TEXT  = 'Моё';

    function markLoaded() {
        try { console.log('[MOE] plugin loaded'); } catch (e) {}
        try { if (window.Lampa && Lampa.Noty) Lampa.Noty.show('Плагин «Моё» подключён'); } catch (e) {}
    }

    function findContainer() {
        var s = ['.full__buttons', '.card__buttons', '.item__buttons', '.full__btns'];
        for (var i = 0; i < s.length; i++) {
            var el = document.querySelector(s[i]);
            if (el) return el;
        }
        // fallback: контейнер рядом с кнопкой «Смотреть»
        var nodes = document.querySelectorAll('[class*="btn"], [class*="start"], [class*="button"]');
        for (var j = 0; j < nodes.length; j++) {
            var t = (nodes[j].textContent || '').trim();
            if (t.indexOf('Смотреть') === 0 || t.indexOf('Трейлер') === 0) return nodes[j].parentElement;
        }
        return null;
    }

    function onClick() {
        var t = document.querySelector('.full__title, .card__title, h1, h2');
        var title = t ? (t.textContent || '').trim() : '';
        if (window.Lampa && Lampa.Modal) {
            Lampa.Modal.open({
                title: 'Моё' + (title ? ': ' + title : ''),
                size: 'medium',
                html: '<div style="padding:1.2em;text-align:center;">Раздел «Моё» — в разработке.</div>'
            });
        }
    }

    function addButton() {
        var container = findContainer();
        if (!container || container.querySelector('.' + BTN_CLASS)) return;

        var sample = container.querySelector('[class*="btn"], [class*="start"], [class*="button"]');
        var btn;
        if (sample) { // клонируем соседнюю кнопку, чтобы унаследовать стили и фокус ТВ
            btn = sample.cloneNode(true);
            btn.className += ' ' + BTN_CLASS;
            btn.innerHTML = '<span>' + BTN_TEXT + '</span>';
        } else {
            btn = document.createElement('div');
            btn.className = BTN_CLASS;
            btn.innerHTML = '<span>' + BTN_TEXT + '</span>';
            btn.style.cssText = 'padding:.6em 1.2em;margin:.3em;border:1px solid rgba(255,255,255,.6);border-radius:.4em;color:#fff;cursor:pointer;';
        }
        btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); onClick(); });
        container.appendChild(btn);
    }

    function init() {
        markLoaded();
        if (typeof Lampa === 'undefined' || !Lampa.Listener) { setTimeout(init, 300); return; }

        ['card_render', 'full_render', 'full_start', 'item_render'].forEach(function (evt) {
            try { Lampa.Listener.add(evt, addButton); } catch (e) {}
        });

        var timer = null;
        new MutationObserver(function () {
            clearTimeout(timer);
            timer = setTimeout(addButton, 200);
        }).observe(document.body, { childList: true, subtree: true });
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', init)
        : init();
})();

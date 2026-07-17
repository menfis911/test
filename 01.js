// Плагин для Lampa — добавляет кнопку "Моё"
// Сохрани как my-plugin.js

(function() {
    'use strict';

    // Проверяем, что Lampa загружена
    if (typeof window.Lampa === 'undefined') {
        console.error('Lampa not loaded');
        return;
    }

    // Функция инициализации
    function startPlugin() {
        
        // Добавляем кнопку при открытии карточки фильма/сериала
        Lampa.Listener.follow('full', function(e) {
            
            // Ждём полной загрузки карточки
            if (e.type !== 'complite') return;
            
            // Получаем элемент активности
            var activity = e.object.activity;
            if (!activity) return;
            
            // Получаем рендер
            var render = activity.render();
            if (!render || !render.length) return;
            
            // Ищем контейнер кнопок
            var buttons = render.find('.full-start__buttons, .full-start-new__buttons');
            if (!buttons.length) return;
            
            // Проверяем, что кнопки ещё нет
            if (buttons.find('.my-custom-btn').length) return;
            
            // Создаём кнопку
            var button = document.createElement('div');
            button.className = 'full-start__button selector my-custom-btn';
            button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Моё</span>';
            
            // Добавляем обработчик через jQuery (стандартный способ Lampa)
            $(button).on('hover:enter', function() {
                Lampa.Noty.show('Кнопка "Моё" нажата!');
            });
            
            // Вставляем кнопку
            buttons.append(button);
        });
    }

    // Запускаем плагин
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') startPlugin();
        });
    }

})();

// Плагин: my-cdn-plugin.js
// Добавляет кнопку "Моё" в карточку контента

(function() {
    'use strict';

    const PLUGIN_NAME = 'my_cdn_plugin';
    const PLUGIN_TITLE = 'Моё';

    // Инициализация плагина
    function init() {
        console.log('[MyCDNPlugin] Plugin initialized');

        // Подписываемся на событие открытия карточки контента (full)
        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite' || event.type === 'start') {
                console.log('[MyCDNPlugin] Full event:', event.type);
                addMyButton(event.object);
            }
        });
    }

    // Добавляем кнопку "Моё" в карточку
    function addMyButton(object) {
        // Ждём, пока DOM отрисуется
        setTimeout(function() {
            const render = object.activity ? object.activity.render() : $(document);
            
            // Ищем контейнер кнопок
            const buttonsContainer = render.find('.full-start__buttons, .full-start-new__buttons, .full-start__buttons-line');
            
            if (!buttonsContainer.length) {
                console.log('[MyCDNPlugin] Buttons container not found, retrying...');
                // Пробуем ещё раз через 500мс
                setTimeout(function() {
                    addMyButton(object);
                }, 500);
                return;
            }

            // Проверяем, что кнопки ещё нет
            if (buttonsContainer.find('.button--mycdn').length) {
                console.log('[MyCDNPlugin] Button already exists');
                return;
            }

            console.log('[MyCDNPlugin] Adding button to container');

            // Создаём кнопку в стиле Lampa
            const button = $(`
                <div class="full-start__button selector button--mycdn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>${PLUGIN_TITLE}</span>
                </div>
            `);

            // Обработчик нажатия
            button.on('hover:enter', function() {
                console.log('[MyCDNPlugin] Button clicked');
                openEpisodesModal(object.data);
            });

            // Вставляем кнопку в панель действий (после кнопки "Смотреть")
            const playButton = buttonsContainer.find('.full-start__button').first();
            if (playButton.length) {
                playButton.after(button);
            } else {
                buttonsContainer.append(button);
            }

            console.log('[MyCDNPlugin] Button added successfully');

        }, 100); // Небольшая задержка для рендера DOM
    }

    // Открываем модальное окно со списком серий
    function openEpisodesModal(item) {
        const title = item.title || item.name || 'Без названия';
        const id = item.id || item.imdb_id || item.kinopoisk_id || item.tmdb_id;

        console.log('[MyCDNPlugin] Opening episodes for:', title, 'ID:', id);

        // Показываем уведомление
        Lampa.Noty.show('Загрузка серий...');

        // Создаём простое модальное окно
        const modal = $('<div class="modal modal--mycdn"></div>');
        const content = $('<div class="modal__content" style="padding: 20px; max-width: 600px;"></div>');
        
        content.append(`<div class="modal__title" style="font-size: 1.5em; margin-bottom: 15px;">${PLUGIN_TITLE}: ${title}</div>`);
        
        const episodesList = $('<div class="episodes-list" style="display: flex; flex-direction: column; gap: 10px;"></div>');

        // Демо-данные
        const isSerial = item.number_of_seasons > 0 || item.seasons;
        
        if (isSerial) {
            // Сериал — показываем сезоны и серии
            const seasons = item.seasons || [
                { season: 1, episodes: [
                    { episode: 1, title: 'Пилотная серия' },
                    { episode: 2, title: 'Серия 2' },
                    { episode: 3, title: 'Серия 3' }
                ]},
                { season: 2, episodes: [
                    { episode: 1, title: 'Серия 1 (сезон 2)' },
                    { episode: 2, title: 'Серия 2 (сезон 2)' }
                ]}
            ];

            seasons.forEach(season => {
                const seasonTitle = $(`<div style="font-weight: bold; margin-top: 10px; color: #fff;">Сезон ${season.season}</div>`);
                episodesList.append(seasonTitle);

                season.episodes.forEach(ep => {
                    const epButton = $(`
                        <div class="selector" style="padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer;">
                            <span style="color: #fff;">Серия ${ep.episode}: ${ep.title}</span>
                        </div>
                    `);
                    
                    epButton.on('hover:enter', function() {
                        Lampa.Noty.show(`Воспроизведение: ${title} - S${season.season}E${ep.episode}`);
                        // Здесь можно добавить реальное воспроизведение
                    });

                    episodesList.append(epButton);
                });
            });
        } else {
            // Фильм — показываем варианты качества
            const sources = [
                { quality: '1080p', label: 'Основной источник' },
                { quality: '720p', label: 'Резервный источник' }
            ];

            sources.forEach(src => {
                const srcButton = $(`
                    <div class="selector" style="padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer;">
                        <span style="color: #fff;">${src.quality} - ${src.label}</span>
                    </div>
                `);
                
                srcButton.on('hover:enter', function() {
                    Lampa.Noty.show(`Воспроизведение: ${title} (${src.quality})`);
                });

                episodesList.append(srcButton);
            });
        }

        content.append(episodesList);
        modal.append(content);

        // Закрытие по кнопке назад
        modal.on('click', function(e) {
            if (e.target === modal[0]) {
                modal.remove();
            }
        });

        $('body').append(modal);
        
        // Фокус на первый элемент
        setTimeout(() => {
            episodesList.find('.selector').first().addClass('focus');
        }, 50);
    }

    // Запускаем плагин
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                init();
            }
        });
    }

    console.log('[MyCDNPlugin] Script loaded');

})();

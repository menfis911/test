// Плагин: my-cdn-plugin.js
// Добавляет кнопку "Моё" в карточку контента

(function() {
    'use strict';

    const PLUGIN_NAME = 'my_cdn_plugin';
    const PLUGIN_TITLE = 'Моё';

    function init() {
        console.log('[MyCDNPlugin] Plugin initialized');

        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'complite') {
                addMyButton(event.object);
            }
        });
    }

    function addMyButton(object) {
        setTimeout(function() {
            const render = object.activity ? object.activity.render() : $(document);
            const buttonsContainer = render.find('.full-start__buttons, .full-start-new__buttons, .full-start__buttons-line');

            if (!buttonsContainer.length) {
                setTimeout(function() {
                    addMyButton(object);
                }, 500);
                return;
            }

            if (buttonsContainer.find('.button--mycdn').length) {
                return;
            }

            // Создаём кнопку
            const button = document.createElement('div');
            button.className = 'full-start__button selector button--mycdn';
            button.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>${PLUGIN_TITLE}</span>
            `;

            // Обработчик через Lampa (НЕ jQuery!)
            button.addEventListener('hover:enter', function() {
                openEpisodesModal(object.data);
            });

            // Вставляем после кнопки "Смотреть"
            const playButton = buttonsContainer.find('.full-start__button').first();
            if (playButton.length) {
                playButton[0].after(button);
            } else {
                buttonsContainer[0].appendChild(button);
            }

        }, 100);
    }

    function openEpisodesModal(item) {
        const title = item.title || item.name || 'Без названия';
        const id = item.id || item.imdb_id || item.kinopoisk_id || item.tmdb_id;

        // Используем нативный Lampa Modal
        const html = `
            <div class="mycdn-modal">
                <div class="mycdn-modal__title">${PLUGIN_TITLE}: ${title}</div>
                <div class="mycdn-modal__list"></div>
            </div>
        `;

        const modal = new Lampa.Modal({
            title: '',
            html: html,
            onBack: function() {
                modal.destroy();
            }
        });

        const list = modal.render().find('.mycdn-modal__list');
        const isSerial = item.number_of_seasons > 0 || item.seasons;

        if (isSerial) {
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

            seasons.forEach(function(season) {
                const seasonTitle = document.createElement('div');
                seasonTitle.className = 'mycdn-season-title';
                seasonTitle.textContent = 'Сезон ' + season.season;
                seasonTitle.style.cssText = 'font-weight: bold; margin: 15px 0 10px; color: #fff; font-size: 1.1em;';
                list[0].appendChild(seasonTitle);

                season.episodes.forEach(function(ep) {
                    const epItem = document.createElement('div');
                    epItem.className = 'selector mycdn-episode';
                    epItem.innerHTML = `<span>Серия ${ep.episode}: ${ep.title}</span>`;
                    epItem.style.cssText = 'padding: 12px; background: rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 8px; color: #fff; cursor: pointer;';

                    epItem.addEventListener('hover:enter', function() {
                        Lampa.Noty.show('Воспроизведение: ' + title + ' S' + season.season + 'E' + ep.episode);
                    });

                    list[0].appendChild(epItem);
                });
            });
        } else {
            const sources = [
                { quality: '1080p', label: 'Основной источник' },
                { quality: '720p', label: 'Резервный источник' }
            ];

            sources.forEach(function(src) {
                const srcItem = document.createElement('div');
                srcItem.className = 'selector mycdn-source';
                srcItem.innerHTML = `<span>${src.quality} - ${src.label}</span>`;
                srcItem.style.cssText = 'padding: 12px; background: rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 8px; color: #fff; cursor: pointer;';

                srcItem.addEventListener('hover:enter', function() {
                    Lampa.Noty.show('Воспроизведение: ' + title + ' (' + src.quality + ')');
                });

                list[0].appendChild(srcItem);
            });
        }

        modal.open();
        modal.toggle();

        // Фокус на первый элемент
        setTimeout(function() {
            const firstItem = list.find('.selector').first();
            if (firstItem.length) {
                Lampa.Controller.collectionSet(modal.render());
                Lampa.Controller.collectionFocus(firstItem[0], modal.render());
            }
        }, 100);
    }

    // Запуск
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') init();
        });
    }

})();

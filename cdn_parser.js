(function() {
    'use strict';
    
    // Предотвращаем двойную загрузку плагина
    if (window.cdn_parser_loaded) return;
    window.cdn_parser_loaded = true;
    
    // Конфигурация
    const CONFIG = {
        // Основной источник - VideoCDN (быстрый и стабильный)
        sources: [
            {
                name: 'VideoCDN',
                apiUrl: 'https://videocdn.tv/api/search',
                // Параметры запроса
                getParams: (title, year) => ({
                    token: 'Z1k1FpYu',  // Публичный демо-токен VideoCDN
                    title: title,
                    year: year,
                    type: 'serial'  // Ищем сериалы
                }),
                parseResponse: (data) => {
                    if (!data || !data.data || !data.data.length) return [];
                    return data.data.map(item => ({
                        id: item.id,
                        title: item.title,
                        year: item.year,
                        seasons: item.seasons || []
                    }));
                }
            }
        ],
        // Дополнительные CDN можно добавить по аналогии
        fallbackSources: [
            'https://kodikapi.com/search?token=ваш_токен&title='
        ]
    };
    
    // Функция для поиска CDN-потоков
    async function searchCDNStream(title, year) {
        const results = [];
        
        for (const source of CONFIG.sources) {
            try {
                const params = source.getParams(title, year);
                const queryString = new URLSearchParams(params).toString();
                const url = `${source.apiUrl}?${queryString}`;
                
                console.log(`[CDN Parser] Поиск на ${source.name}:`, url);
                
                const response = await fetch(url);
                const data = await response.json();
                const parsed = source.parseResponse(data);
                
                if (parsed.length) {
                    results.push({
                        source: source.name,
                        items: parsed
                    });
                }
            } catch (error) {
                console.error(`[CDN Parser] Ошибка на ${source.name}:`, error);
            }
        }
        
        return results;
    }
    
    // Функция отображения выбора сезона/серии
    function showSeasonSelector(serialData, sourceName) {
        if (!serialData.seasons || serialData.seasons.length === 0) {
            Lampa.Modal.close();
            Lampa.Notify.show('Нет доступных сезонов', null, null, 3000);
            return;
        }
        
        const items = [];
        
        for (const season of serialData.seasons) {
            const seasonNum = season.number || season.season;
            const episodes = season.episodes || [];
            
            items.push({
                title: `${seasonNum} сезон`,
                template: 'selectbox_icon',
                customData: {
                    type: 'season',
                    season: seasonNum,
                    episodes: episodes,
                    serialId: serialData.id,
                    source: sourceName
                }
            });
        }
        
        Lampa.Select.show({
            title: `${serialData.title} — Выберите сезон`,
            items: items,
            onSelect: (item) => {
                if (item.customData.type === 'season') {
                    showEpisodeSelector(item.customData);
                }
            },
            onBack: () => {
                Lampa.Modal.close();
                Lampa.Controller.toggle('content');
            }
        });
    }
    
    // Функция выбора серии
    function showEpisodeSelector(seasonData) {
        const episodes = seasonData.episodes;
        if (!episodes || episodes.length === 0) {
            Lampa.Notify.show('Нет доступных серий', null, null, 3000);
            return;
        }
        
        const items = episodes.map(ep => ({
            title: `${ep.number || ep.episode} серия${ep.title ? ': ' + ep.title : ''}`,
            template: 'selectbox_icon',
            customData: {
                type: 'episode',
                episode: ep.number || ep.episode,
                episodeId: ep.id,
                season: seasonData.season,
                serialId: seasonData.serialId
            }
        }));
        
        Lampa.Select.show({
            title: `${seasonData.season} сезон — Выберите серию`,
            items: items,
            onSelect: async (item) => {
                if (item.customData.type === 'episode') {
                    await getStreamUrlAndPlay(item.customData);
                }
            },
            onBack: () => {
                // Возврат к выбору сезона (нужно сохранить данные сериала)
                Lampa.Modal.close();
            }
        });
    }
    
    // Получение ссылки на видео и запуск плеера
    async function getStreamUrlAndPlay(episodeData) {
        Lampa.Modal.open({
            title: 'Загрузка',
            html: '<div style="text-align:center;padding:20px">🔄 Поиск видеопотока...</div>',
            size: 'small'
        });
        
        try {
            // Формируем запрос к VideoCDN для получения плейлиста
            const streamUrl = `https://videocdn.tv/api/stream?token=Z1k1FpYu&id=${episodeData.episodeId}&quality=720`;
            
            const response = await fetch(streamUrl);
            const data = await response.json();
            
            if (data && data.data && data.data.url) {
                Lampa.Modal.close();
                startPlayer(data.data.url, episodeData);
            } else {
                throw new Error('Ссылка не найдена');
            }
        } catch (error) {
            Lampa.Modal.close();
            console.error('[CDN Parser] Ошибка получения потока:', error);
            Lampa.Notify.show('Не удалось получить ссылку на видео', null, null, 4000);
        }
    }
    
    // Запуск встроенного плеера Lampa
    function startPlayer(url, episodeData) {
        const playerData = {
            title: `Серия ${episodeData.episode}`,
            description: `${episodeData.season} сезон, ${episodeData.episode} серия`,
            video: {
                url: url,
                type: 'mp4'
            }
        };
        
        // Используем стандартный плеер Lampa
        if (Lampa.Player && Lampa.Player.play) {
            Lampa.Player.play(playerData);
        } else if (Lampa.PlayerNative) {
            Lampa.PlayerNative.play(playerData);
        } else {
            // Альтернативный вариант - открыть в браузере
            window.open(url, '_blank');
        }
    }
    
    // Основная функция - добавляем кнопку в карточку фильма
    function addCDNButton() {
        // Следим за открытием карточки фильма
        Lampa.Listener.follow('full', function(event) {
            if (event.type === 'build') {
                const card = event.object;
                const movieData = card.data;
                
                // Проверяем, что это сериал
                if (movieData.method !== 'tv' && !movieData.isSerial) return;
                
                // Ждем появления контейнера с кнопками
                setTimeout(() => {
                    const buttonsContainer = card.activity.$el.find('.full-buttons');
                    if (!buttonsContainer.length) return;
                    
                    // Проверяем, не добавлена ли уже кнопка
                    if (buttonsContainer.find('.cdn-button').length) return;
                    
                    // Создаем кнопку CDN
                    const cdnButton = $('<div>', {
                        class: 'full-button cdn-button selector',
                        html: '<div class="full-button-icon">🌐</div><div class="full-button-text">CDN Stream</div>',
                        css: {
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }
                    });
                    
                    cdnButton.on('click', async () => {
                        const title = movieData.title || movieData.name;
                        const year = movieData.year || movieData.release_date?.split('-')[0];
                        
                        if (!title) {
                            Lampa.Notify.show('Не удалось определить название', null, null, 3000);
                            return;
                        }
                        
                        Lampa.Modal.open({
                            title: 'Поиск CDN потоков',
                            html: '<div style="text-align:center;padding:20px">🔍 Ищем видео на CDN...</div>',
                            size: 'small'
                        });
                        
                        const results = await searchCDNStream(title, year);
                        
                        Lampa.Modal.close();
                        
                        if (!results.length || !results[0].items.length) {
                            Lampa.Notify.show('Ничего не найдено на CDN', null, null, 4000);
                            return;
                        }
                        
                        // Показываем результаты
                        const items = results[0].items.map(item => ({
                            title: `${item.title} (${item.year})`,
                            template: 'selectbox_icon',
                            customData: {
                                serialId: item.id,
                                title: item.title,
                                seasons: item.seasons,
                                source: results[0].source
                            }
                        }));
                        
                        Lampa.Select.show({
                            title: `Найдено на ${results[0].source}`,
                            items: items,
                            onSelect: (selected) => {
                                showSeasonSelector(selected.customData, selected.customData.source);
                            },
                            onBack: () => {
                                Lampa.Controller.toggle('content');
                            }
                        });
                    });
                    
                    buttonsContainer.append(cdnButton);
                }, 500);
            }
        });
    }
    
    // Инициализация плагина
    function init() {
        console.log('[CDN Parser] Плагин загружен');
        addCDNButton();
        
        // Добавляем пункт в настройки
        if (Lampa.SettingsApi && Lampa.SettingsApi.addComponent) {
            Lampa.SettingsApi.addComponent({
                component: 'cdn_parser',
                name: 'CDN Parser',
                icon: '<svg>...</svg>'
            });
            
            Lampa.SettingsApi.addParam({
                component: 'cdn_parser',
                param: {
                    name: 'cdn_source',
                    type: 'select',
                    default: 'videocdn',
                    values: {
                        videocdn: 'VideoCDN',
                        kodik: 'Kodik (при наличии токена)'
                    }
                },
                field: {
                    name: 'Источник CDN',
                    description: 'Выберите предпочитаемый CDN-сервис'
                }
            });
        }
    }
    
    // Запускаем после готовности приложения
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function(event) {
            if (event.type === 'ready') {
                init();
            }
        });
    }
})();

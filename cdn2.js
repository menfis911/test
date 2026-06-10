// CDN Плагин - Добавляет кнопку в карточку фильма
(function(){
    if(typeof Lampa === "undefined") return;
    
    let initialized = false;
    
    Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready' && !initialized){
            initialized = true;
            console.log('✅ CDN Плагин активирован');
            
            // Следим за открытием карточки фильма/сериала
            Lampa.Listener.follow('full', function(event){
                if(event.type === 'open'){
                    setTimeout(() => {
                        addCDNButton(event.object);
                    }, 500);
                }
            });
        }
    });
    
    function addCDNButton(activity){
        let card = activity.$el;
        let movieData = activity.data;
        
        // Проверяем, что это сериал
        if(movieData.method !== 'tv' && !movieData.is_serial && !movieData.serial){
            return;
        }
        
        // Ищем контейнер с кнопками
        let buttonsContainer = card.find('.full-buttons, .buttons-container, .video-buttons');
        
        if(!buttonsContainer.length){
            buttonsContainer = card.find('.info-block .buttons');
        }
        
        if(!buttonsContainer.length){
            console.log('Контейнер кнопок не найден');
            return;
        }
        
        // Проверяем, не добавлена ли уже кнопка
        if(buttonsContainer.find('.cdn-custom-button').length){
            return;
        }
        
        // Создаём кнопку
        const cdnButton = $(`
            <div class="full-button cdn-custom-button" style="cursor:pointer; display:inline-flex; align-items:center; gap:8px; padding:10px 15px; background:#2c3e50; border-radius:8px; margin:0 5px;">
                <div style="font-size:18px;">🌐</div>
                <div style="font-size:14px;">CDN Смотреть</div>
            </div>
        `);
        
        cdnButton.on('click', function(){
            searchSerialOnCDN(movieData);
        });
        
        buttonsContainer.append(cdnButton);
        console.log('✅ Кнопка CDN добавлена');
    }
    
    async function searchSerialOnCDN(movieData){
        const title = movieData.title || movieData.name;
        const year = movieData.year || movieData.release_date?.split('-')[0] || '';
        
        if(!title){
            Lampa.Notify.show('Не удалось определить название', null, null, 3000);
            return;
        }
        
        // Показываем диалог выбора качества
        Lampa.Select.show({
            title: `Поиск: ${title}`,
            items: [
                { title: '🎬 Поиск на VideoCDN', quality: '720' },
                { title: '📺 HD качество (720p)', quality: '720' },
                { title: '🎥 SD качество (480p)', quality: '480' }
            ],
            onSelect: async (index) => {
                const quality = index === 0 ? '720' : (index === 1 ? '720' : '480');
                await findAndPlay(title, year, quality);
            }
        });
    }
    
    async function findAndPlay(title, year, quality){
        Lampa.Modal.open({
            title: '🌐 CDN Поиск',
            html: '<div style="text-align:center;padding:20px">🔍 Ищем сериал: <b>' + title + '</b><br><br>🔄 Загрузка...</div>',
            size: 'small'
        });
        
        try {
            // Поиск сериала
            const searchUrl = `https://videocdn.tv/api/search?token=Z1k1FpYu&title=${encodeURIComponent(title)}&type=serial`;
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            if(!data || !data.data || data.data.length === 0){
                Lampa.Modal.close();
                Lampa.Notify.show('❌ Сериал не найден на CDN', null, null, 4000);
                return;
            }
            
            const serial = data.data[0];
            
            // Собираем информацию о сезонах
            const seasons = serial.seasons || [];
            
            if(seasons.length === 0){
                Lampa.Modal.close();
                Lampa.Notify.show('❌ Нет доступных сезонов', null, null, 4000);
                return;
            }
            
            Lampa.Modal.close();
            
            // Показываем выбор сезона
            const seasonItems = seasons.map(s => ({
                title: `${s.number || s.season} сезон (${s.episodes?.length || 0} серий)`,
                season: s.number || s.season,
                seasonData: s,
                serialId: serial.id
            }));
            
            Lampa.Select.show({
                title: `${serial.title} - Выберите сезон`,
                items: seasonItems,
                onSelect: async (seasonIndex) => {
                    const selected = seasonItems[seasonIndex];
                    showEpisodes(selected, quality);
                }
            });
            
        } catch(error){
            Lampa.Modal.close();
            console.error('CDN Error:', error);
            Lampa.Notify.show('⚠️ Ошибка подключения: ' + error.message, null, null, 4000);
        }
    }
    
    function showEpisodes(seasonData, quality){
        const episodes = seasonData.seasonData.episodes || [];
        
        if(episodes.length === 0){
            Lampa.Notify.show('Нет серий в этом сезоне', null, null, 3000);
            return;
        }
        
        const episodeItems = episodes.map(ep => ({
            title: `Серия ${ep.number || ep.episode}` + (ep.title ? `: ${ep.title}` : ''),
            episodeId: ep.id,
            episodeNum: ep.number || ep.episode
        }));
        
        Lampa.Select.show({
            title: `${seasonData.season} сезон - Выберите серию`,
            items: episodeItems,
            onSelect: async (epIndex) => {
                const selected = episodeItems[epIndex];
                await playEpisode(selected.episodeId, quality, seasonData.season, selected.episodeNum);
            }
        });
    }
    
    async function playEpisode(episodeId, quality, seasonNum, episodeNum){
        Lampa.Modal.open({
            title: 'Загрузка видео',
            html: '<div style="text-align:center;padding:20px">🎬 Получаем ссылку...<br><br>⏳ Пожалуйста, подождите</div>',
            size: 'small'
        });
        
        try {
            const streamUrl = `https://videocdn.tv/api/stream?token=Z1k1FpYu&id=${episodeId}&quality=${quality}`;
            const response = await fetch(streamUrl);
            const data = await response.json();
            
            Lampa.Modal.close();
            
            if(data && data.data && data.data.url){
                // Запускаем плеер
                if(Lampa.Player && Lampa.Player.play){
                    Lampa.Player.play({
                        title: `${seasonNum} сезон ${episodeNum} серия`,
                        video: {
                            url: data.data.url,
                            type: 'mp4'
                        }
                    });
                } else {
                    // Альтернативный запуск
                    window.open(data.data.url, '_blank');
                }
            } else {
                Lampa.Notify.show('❌ Не удалось получить ссылку на видео', null, null, 4000);
            }
        } catch(error){
            Lampa.Modal.close();
            console.error('Stream error:', error);
            Lampa.Notify.show('⚠️ Ошибка воспроизведения', null, null, 4000);
        }
    }
    
    // Для старых версий Lampa
    if(window.appready){
        initialized = true;
        console.log('✅ CDN Плагин загружен (appready)');
    }
})();
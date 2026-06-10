// CDN как полноценный источник для Lampa
(function(){
    if (typeof Lampa === "undefined") return;
    
    Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready'){
            console.log('✅ CDN Source инициализирован');
            
            // Регистрируем наш источник для сериалов
            if (Lampa.Source && Lampa.Source.add) {
                Lampa.Source.add({
                    id: "cdn_parser_source",
                    title: "🌐 CDN (VideoCDN)",
                    type: "serial",
                    search: function(query, page, callback){
                        // Здесь можно реализовать поиск, но пока просто заглушка
                        callback([]);
                    },
                    torrent: function(season, episode, data, callback){
                        // Эта функция вызывается, когда пользователь выбирает серию
                        let title = data.title || data.name;
                        console.log(`Ищем на CDN: ${title} S${season}E${episode}`);
                        
                        // Показываем уведомление, что ищем
                        if (Lampa.Notify) {
                            Lampa.Notify.show(`🔍 Поиск ${title} на CDN...`, null, null, 2000);
                        }
                        
                        // Вызываем вашу основную функцию поиска
                        findAndPlayOnCDN(title, season, episode, callback);
                    }
                });
                console.log('✅ CDN Source зарегистрирован');
            } else {
                console.error('❌ Lampa.Source.add не найден');
            }
        }
    });
    
    async function findAndPlayOnCDN(title, season, episode, callback){
        try {
            // Поиск сериала на VideoCDN
            let searchUrl = `https://videocdn.tv/api/search?token=Z1k1FpYu&title=${encodeURIComponent(title)}&type=serial`;
            let response = await fetch(searchUrl);
            let data = await response.json();
            
            if (data && data.data && data.data.length > 0){
                let serial = data.data[0];
                let seasonData = serial.seasons.find(s => (s.number || s.season) == season);
                
                if (seasonData && seasonData.episodes){
                    let episodeData = seasonData.episodes.find(ep => (ep.number || ep.episode) == episode);
                    
                    if (episodeData && episodeData.id){
                        let streamUrl = `https://videocdn.tv/api/stream?token=Z1k1FpYu&id=${episodeData.id}&quality=720`;
                        let streamResponse = await fetch(streamUrl);
                        let streamData = await streamResponse.json();
                        
                        if (streamData && streamData.data && streamData.data.url){
                            // Отправляем ссылку обратно в Lampa для воспроизведения
                            callback([{
                                url: streamData.data.url,
                                quality: "720p",
                                title: "CDN Видео"
                            }]);
                            return;
                        }
                    }
                }
            }
            callback([]);
        } catch(error){
            console.error("CDM Source Error:", error);
            callback([]);
        }
    }
})();
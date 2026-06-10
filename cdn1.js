// CDN Parser for Lampa - Работает как источник видео
(function(){
    if(typeof Lampa === "undefined") return;
    
    Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready'){
            console.log('✅ CDN Source плагин загружен');
            
            // Регистрируем как источник для сериалов
            Lampa.Source.add({
                id: 'cdn_parser',
                title: 'CDN Video (beta)',
                type: 'serial',
                // Функция поиска сериала
                search: async function(query, page, callback){
                    console.log('Поиск CDN:', query);
                    callback([]); // Не используем поиск в источнике
                },
                // Функция получения видео для серии
                torrent: async function(season, episode, serialData, callback){
                    console.log('Запрос CDN для', serialData.title, season, episode);
                    
                    // Ищем сериал по названию
                    const title = serialData.title || serialData.name;
                    
                    try {
                        const searchUrl = `https://videocdn.tv/api/search?token=Z1k1FpYu&title=${encodeURIComponent(title)}&type=serial`;
                        const response = await fetch(searchUrl);
                        const data = await response.json();
                        
                        if(data && data.data && data.data.length > 0){
                            const serial = data.data[0];
                            
                            // Находим нужный сезон и серию
                            const seasonData = serial.seasons.find(s => (s.number || s.season) == season);
                            if(seasonData && seasonData.episodes){
                                const episodeData = seasonData.episodes.find(ep => (ep.number || ep.episode) == episode);
                                
                                if(episodeData && episodeData.id){
                                    // Получаем ссылку на видео
                                    const streamUrl = `https://videocdn.tv/api/stream?token=Z1k1FpYu&id=${episodeData.id}&quality=720`;
                                    const streamResponse = await fetch(streamUrl);
                                    const streamData = await streamResponse.json();
                                    
                                    if(streamData && streamData.data && streamData.data.url){
                                        // Отправляем результат в плеер
                                        callback([{
                                            url: streamData.data.url,
                                            quality: '720p',
                                            title: 'CDN Видео'
                                        }]);
                                        return;
                                    }
                                }
                            }
                        }
                        callback([]);
                    } catch(error){
                        console.error('CDN error:', error);
                        callback([]);
                    }
                }
            });
            
            // Регистрируем для фильмов (на всякий случай)
            Lampa.Source.add({
                id: 'cdn_parser_movie',
                title: 'CDN Video (beta)',
                type: 'movie',
                torrent: async function(movieData, callback){
                    callback([]);
                }
            });
        }
    });
})();

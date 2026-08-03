(function () {
    'use strict';

    var ARCHIVE = 'https://archive.org';
    var PEERTUBE = 'https://peertube.cpy.re';

    function startPlugin() {

        function addButton(render, movie) {
            if (!render || !render.length) return;
            if (render.find('.moe--button').length) return;

            var anchor = render.find('.view--torrent');
            if (!anchor.length) anchor = render.find('.full-start__button').last();
            if (!anchor.length) return;

            var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round">' +
                       '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9l-5.3 2.7 1.1-5.8-4.3-4.1 5.9-.8z"/></svg>';

            var btn = $('<div class="full-start__button selector view--online moe--button">' +
                        ICON + '<span>Моё</span></div>');

            var enter = function () { showCdnSelect(movie); };
            btn.on('hover:enter', enter).on('click', enter);
            anchor.after(btn);
        }

        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') addButton(e.object.activity.render(), e.data.movie);
        });
        try {
            if (Lampa.Activity.active().component == 'full')
                addButton(Lampa.Activity.active().activity.render(), Lampa.Activity.active().card);
        } catch (e) {}

        function showCdnSelect(movie) {
            var back = Lampa.Controller.enabled().name;
            Lampa.Select.show({
                title: 'Моё — выбрать источник',
                items: [
                    { title: 'Peertube',    subtitle: 'свежие фильмы и сериалы · прямые mp4',         cdn: 'peertube' },
                    { title: 'Archive.org', subtitle: 'классика, public domain и старые фильмы',      cdn: 'archive'  }
                ],
                onBack: function () { Lampa.Controller.toggle(back); },
                onSelect: function (a) {
                    Lampa.Controller.toggle(back);
                    if (a.cdn === 'peertube') peertubeSearch(movie);
                    if (a.cdn === 'archive')  archiveSearch(movie);
                }
            });
        }

        function ajax(url, ok, err) {
            $.ajax({ url: url, dataType: 'json', timeout: 15000, success: ok, error: err });
        }

        /* ──────── PEERTUBE ──────── */
        function peertubeSearch(movie) {
            Lampa.Loading.start();
            var q = encodeURIComponent(movie.title || movie.original_title || '');
            ajax(PEERTUBE + '/api/v1/videos?search=' + q + '&count=10&nsfw=both&sort=-publishedAt',
                function (json) {
                    Lampa.Loading.stop();
                    var list = (json && json.data) || [];
                    if (!list.length) return Lampa.Noty.show('Peertube: ничего не найдено');
                    var back = Lampa.Controller.enabled().name;
                    Lampa.Select.show({
                        title: 'Peertube — результаты',
                        items: list.map(function (v) {
                            var file = (v.files && v.files[0]) || { fileUrl: null };
                            return {
                                title: v.name,
                                subtitle: (v.duration ? Math.floor(v.duration/60) + ' мин · ' : '') +
                                          (v.views || 0) + ' просм.',
                                _url: file.fileUrl,
                                _thumb: v.thumbnailPath || v.previewPath
                            };
                        }).filter(function (x) { return x._url; }),
                        onBack: function () { Lampa.Controller.toggle(back); },
                        onSelect: function (a) {
                            Lampa.Controller.toggle(back);
                            if (!a._url) return Lampa.Noty.show('Peertube: нет файла');
                            var el = { title: a.title, url: a._url, isonline: true, poster: PEERTUBE + a._thumb };
                            Lampa.Player.play(el);
                        }
                    });
                },
                function () {
                    Lampa.Loading.stop();
                    Lampa.Noty.show('Peertube: ошибка сети');
                });
        }

        /* ──────── ARCHIVE.ORG (умный поиск) ──────── */
        function archiveSearch(movie) {
            Lampa.Loading.start();

            // Ищем и по оригинальному названию (латиницей, лучше индексируется), и по медиатипу movies
            var title = (movie.original_title || movie.title || '').replace(/[^\w\s]/g, ' ').trim();
            if (!title) { Lampa.Loading.stop(); return Lampa.Noty.show('Нет названия'); }

            // Несколько вариантов запроса — Archive часто выдаёт результат хотя бы на одном
            var queries = [
                'title:("' + title + '") AND mediatype:movies',
                'title:("' + title + '") AND mediatype:collection_movies',
                '"' + title + '" AND mediatype:movies'
            ];

            var tryIdx = 0;
            function tryNext() {
                if (tryIdx >= queries.length) {
                    Lampa.Loading.stop();
                    return Lampa.Noty.show('Archive.org: ничего не найдено (попробуйте оригинальное название на английском)');
                }
                var q = queries[tryIdx++];
                ajax(ARCHIVE + '/advancedsearch.php?q=' + encodeURIComponent(q) +
                     '&fl[]=identifier&fl[]=title&fl[]=description&fl[]=year&rows=10&page=1&output=json',
                    function (json) {
                        var docs = (json && json.response && json.response.docs) || [];
                        if (!docs.length) return tryNext();
                        Lampa.Loading.stop();
                        showArchiveResults(docs);
                    },
                    function () { tryNext(); });
            }
            tryNext();
        }

        function showArchiveResults(docs) {
            var back = Lampa.Controller.enabled().name;
            Lampa.Select.show({
                title: 'Archive.org — результаты',
                items: docs.map(function (d) {
                    var year = d.year ? (' · ' + (typeof d.year === 'string' ? d.year.slice(0,4) : d.year[0])) : '';
                    return { title: (d.title || d.identifier) + year, obj: d };
                }),
                onBack: function () { Lampa.Controller.toggle(back); },
                onSelect: function (a) {
                    Lampa.Controller.toggle(back);
                    archiveFiles(a.obj);
                }
            });
        }

        function archiveFiles(doc) {
            Lampa.Loading.start();
            ajax(ARCHIVE + '/metadata/' + doc.identifier, function (json) {
                Lampa.Loading.stop();
                var files = (json.files || []).filter(function (f) {
                    return /\.mp4$/i.test(f.name) &&
                           /mpeg4|h\.264|video/i.test(f.format || '') &&
                           f.size;
                }).sort(function (a, b) {
                    // Приоритет — файлы побольше (обычно это HD-версия)
                    return (parseInt(b.size) || 0) - (parseInt(a.size) || 0);
                });
                if (!files.length) return Lampa.Noty.show('Archive.org: нет mp4 в этом архиве');
                playSelect(doc.title || doc.identifier, files.map(function (f) {
                    var sizeMB = Math.round(parseInt(f.size || 0) / 1024 / 1024);
                    return {
                        title: f.name.replace(/\.mp4$/i, ''),
                        subtitle: sizeMB + ' МБ' + (f.length ? ' · ' + Math.round(parseFloat(f.length)/60) + ' мин' : ''),
                        url: ARCHIVE + '/download/' + doc.identifier + '/' + encodeURIComponent(f.name)
                    };
                }));
            }, function () {
                Lampa.Loading.stop();
                Lampa.Noty.show('Archive.org: ошибка метаданных');
            });
        }

        function playSelect(title, items) {
            if (items.length === 1) return play(items[0], items);
            var back = Lampa.Controller.enabled().name;
            Lampa.Select.show({
                title: title,
                items: items,
                onBack: function () { Lampa.Controller.toggle(back); },
                onSelect: function (a) { Lampa.Controller.toggle(back); play(a, items); }
            });
        }

        function play(item, playlist) {
            var el = { title: item.title, url: item.url, isonline: true };
            if (playlist && playlist.length > 1) {
                el.playlist = playlist.map(function (p) {
                    return { title: p.title, url: p.url, isonline: true };
                });
            }
            Lampa.Player.play(el);
            if (el.playlist) Lampa.Player.playlist(el.playlist);
        }
    }

    startPlugin();
    try { console.log('[MOE] plugin loaded'); } catch (e) {}
})();

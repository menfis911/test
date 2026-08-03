(function () {
    'use strict';

    /* CDN — бесплатные, без ключей. Хочешь другие — допиши в showCdnSelect() */
    var CFG = {
        anilibria_api: 'https://api.anilibria.tv/v3',
        anilibria_cdn: 'https://cache.libria.fun',
        archive:       'https://archive.org'
    };

    var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round">' +
               '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9l-5.3 2.7 1.1-5.8-4.3-4.1 5.9-.8z"/></svg>';

    function startPlugin() {

        /* ─────────── КНОПКА НА КАРТОЧКЕ (как соседние) ─────────── */
        function addButton(render, movie) {
            if (!render || !render.length) return;
            if (render.find('.moe--button').length) return;

            var anchor = render.find('.view--torrent');                 // рядом с «Смотреть»
            if (!anchor.length) anchor = render.find('.full-start__button').last();
            if (!anchor.length) return;

            var btn = $('<div class="full-start__button selector view--online moe--button">' +
                        ICON + '<span>Моё</span></div>');

            var enter = function () { showCdnSelect(movie); };
            btn.on('hover:enter', enter);   // пульт ТВ
            btn.on('click', enter);         // мышь/тач

            anchor.after(btn);
        }

        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') addButton(e.object.activity.render(), e.data.movie);
        });
        try {
            if (Lampa.Activity.active().component == 'full')
                addButton(Lampa.Activity.active().activity.render(), Lampa.Activity.active().card);
        } catch (e) {}

        /* ─────────── ВЫБОР CDN ─────────── */
        function showCdnSelect(movie) {
            var back = Lampa.Controller.enabled().name;
            Lampa.Select.show({
                title: 'Моё — выбрать CDN',
                items: [
                    { title: 'AniLibria',   subtitle: 'аниме и сериалы · CDN libria',        cdn: 'anilibria' },
                    { title: 'Archive.org', subtitle: 'классика / public domain · CDN archive.org', cdn: 'archive' }
                ],
                onBack: function () { Lampa.Controller.toggle(back); },
                onSelect: function (a) {
                    Lampa.Controller.toggle(back);
                    if (a.cdn == 'anilibria') anilibriaSearch(movie);
                    if (a.cdn == 'archive')  archiveSearch(movie);
                }
            });
        }

        function ajax(url, ok, err) {
            $.ajax({ url: url, dataType: 'json', timeout: 12000, success: ok, error: err });
        }

        /* ─────────── AniLibria ─────────── */
        function anilibriaSearch(movie) {
            Lampa.Loading.start();
            var q = encodeURIComponent(movie.original_title || movie.title || '');
            ajax(CFG.anilibria_api + '/title/search?search=' + q + '&limit=5', function (json) {
                Lampa.Loading.stop();
                var list = (json && json.list) || [];
                if (!list.length) return Lampa.Noty.show('AniLibria: ничего не найдено');
                if (list.length == 1) return anilibriaEpisodes(list[0]);
                var back = Lampa.Controller.enabled().name;
                Lampa.Select.show({
                    title: 'AniLibria: что открыть',
                    items: list.map(function (t) {
                        return { title: (t.names && t.names.ru) || t.names.original, obj: t };
                    }),
                    onBack: function () { Lampa.Controller.toggle(back); },
                    onSelect: function (a) { Lampa.Controller.toggle(back); anilibriaEpisodes(a.obj); }
                });
            }, function () {
                Lampa.Loading.stop();
                Lampa.Noty.show('AniLibria: ошибка сети/CORS');
            });
        }

        function anilibriaEpisodes(t) {
            var list = (t.player && t.player.list) || {}, items = [];
            for (var k in list) {
                var ep = list[k];
                if (ep && ep.hls) items.push({
                    title: 'Серия ' + (ep.episode || k),
                    subtitle: ep.name || '',
                    url: CFG.anilibria_cdn + ep.hls
                });
            }
            if (!items.length) return Lampa.Noty.show('AniLibria: нет серий');
            playSelect((t.names.ru || t.names.original), items);
        }

        /* ─────────── Archive.org ─────────── */
        function archiveSearch(movie) {
            Lampa.Loading.start();
            var q = (movie.original_title || movie.title || '').replace(/[^\w\s]/g, ' ').trim();
            ajax(CFG.archive + '/advancedsearch.php?q=' + encodeURIComponent('title:(' + q + ')') +
                 '&fl[]=identifier&fl[]=title&rows=8&page=1&output=json', function (json) {
                Lampa.Loading.stop();
                var docs = (json && json.response && json.response.docs) || [];
                if (!docs.length) return Lampa.Noty.show('Archive.org: ничего не найдено');
                var back = Lampa.Controller.enabled().name;
                Lampa.Select.show({
                    title: 'Archive.org: что открыть',
                    items: docs.map(function (d) { return { title: d.title || d.identifier, obj: d }; }),
                    onBack: function () { Lampa.Controller.toggle(back); },
                    onSelect: function (a) { Lampa.Controller.toggle(back); archiveFiles(a.obj); }
                });
            }, function () {
                Lampa.Loading.stop();
                Lampa.Noty.show('Archive.org: ошибка сети');
            });
        }

        function archiveFiles(doc) {
            Lampa.Loading.start();
            ajax(CFG.archive + '/metadata/' + doc.identifier, function (json) {
                Lampa.Loading.stop();
                var files = (json.files || []).filter(function (f) {
                    return /\.mp4$/i.test(f.name) && /mpeg4|h\.264|video/i.test(f.format || '');
                });
                if (!files.length) return Lampa.Noty.show('Archive.org: нет mp4');
                playSelect(doc.title || doc.identifier, files.map(function (f) {
                    return {
                        title: f.name.replace(/\.mp4$/i, ''),
                        url: CFG.archive + '/download/' + doc.identifier + '/' + encodeURIComponent(f.name)
                    };
                }));
            }, function () {
                Lampa.Loading.stop();
                Lampa.Noty.show('Archive.org: ошибка метаданных');
            });
        }

        /* ─────────── ВОСПРОИЗВЕДЕНИЕ ─────────── */
        function playSelect(title, items) {
            if (items.length == 1) return play(items[0], items);
            var back = Lampa.Controller.enabled().name;
            Lampa.Select.show({
                title: title,
                items: items,
                onBack: function () { Lampa.Controller.toggle(back); },
                onSelect: function (a) { Lampa.Controller.toggle(back); play(a, items); }
            });
        }

        function play(item, playlist) {
            var element = { title: item.title, url: item.url, isonline: true };
            if (playlist && playlist.length > 1) {
                element.playlist = playlist.map(function (p) {
                    return { title: p.title, url: p.url, isonline: true };
                });
            }
            Lampa.Player.play(element);
            if (element.playlist) Lampa.Player.playlist(element.playlist);
        }
    }

    startPlugin();
    try { console.log('[MOE] plugin loaded'); } catch (e) {}
})();

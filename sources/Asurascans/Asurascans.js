"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsuraScans = exports.AsuraScansInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const ASURA_BASE_URL = 'https://asuracomic.net';
exports.AsuraScansInfo = {
    version: '1.0.0',
    name: 'AsuraScans',
    description: 'Extension for Asura Scans',
    author: 'Matthijs07g',
    authorWebsite: 'https://github.com/Matthijs07g',
    icon: './include/icon.png',
    contentRating: paperback_extensions_common_1.ContentRating.EVERYONE,
    websiteBaseURL: 'asuracomic.net',
    language: paperback_extensions_common_1.LanguageCode.ENGLISH,
    sourceTags: [
        {
            text: "Recommended",
            type: paperback_extensions_common_1.TagType.BLUE
        }
    ]
};
class AsuraScans extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = createRequestManager({
            requestsPerSecond: 2,
            requestTimeout: 15000
        });
    }
    ///////////////////////////////
    // Manga Metadata Fetching
    ///////////////////////////////
    getMangaDetails(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const request = createRequestObject({
                url: `${ASURA_BASE_URL}/series/${mangaId}/`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Add other headers if needed
                }
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const titles = [$('.post-title h1').text().trim()];
            const image = (_a = $('.summary_image img').attr('src')) !== null && _a !== void 0 ? _a : '';
            const author = $('.author-content a').text().trim();
            const artist = $('.artist-content a').text().trim();
            const desc = $('.summary__content p').text().trim();
            // Status detection
            const statusText = $('.post-content_item:contains("Status") .summary-content')
                .text().trim().toLowerCase();
            let status = paperback_extensions_common_1.MangaStatus.UNKNOWN;
            if (statusText.includes('ongoing'))
                status = paperback_extensions_common_1.MangaStatus.ONGOING;
            if (statusText.includes('completed'))
                status = paperback_extensions_common_1.MangaStatus.COMPLETED;
            // Tag handling
            const genres = $('.genres-content a').toArray().map((el) => createTag({ id: $(el).text().trim(), label: $(el).text().trim() }));
            const tagSections = [
                createTagSection({ id: 'genres', label: 'Genres', tags: genres })
            ];
            return createManga({
                id: mangaId,
                titles,
                image,
                rating: 0,
                status,
                author,
                artist,
                tags: tagSections,
                desc
            });
        });
    }
    ///////////////////////////////
    // Chapter Fetching
    ///////////////////////////////
    getChapters(mangaId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${ASURA_BASE_URL}/series/${mangaId}/`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Add other headers if needed
                }
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return $('.wp-manga-chapter a').toArray().map((el) => {
                var _a, _b, _c;
                const url = (_a = $(el).attr('href')) !== null && _a !== void 0 ? _a : '';
                const name = $(el).text().trim();
                const chapNum = parseFloat((_c = (_b = name.match(/(\d+\.?\d*)/)) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : '0');
                return createChapter({
                    id: this.getChapterIdFromUrl(url),
                    mangaId,
                    name,
                    langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                    chapNum,
                    time: new Date() // Add proper date parsing if available
                });
            }).reverse(); // Reverse to show latest chapters first
        });
    }
    ///////////////////////////////
    // Page Fetching
    ///////////////////////////////
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${ASURA_BASE_URL}/manga/${mangaId}/${chapterId}/`,
                method: 'GET'
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const pages = $('.reading-content img').toArray().map((el) => { var _a, _b, _c, _d; return (_d = (_b = (_a = $(el).attr('data-src')) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : (_c = $(el).attr('src')) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : ''; }).filter((url) => url.length > 0);
            return createChapterDetails({
                id: chapterId,
                mangaId,
                pages,
                longStrip: true
            });
        });
    }
    ///////////////////////////////
    // Search Implementation    https://asuracomic.net/series?page=1&name={searchterm}
    ///////////////////////////////
    getSearchResults(query, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const searchTerm = (_b = (_a = query.title) === null || _a === void 0 ? void 0 : _a.replace(/ /g, '+')) !== null && _b !== void 0 ? _b : '%20';
            const request = createRequestObject({
                url: `${ASURA_BASE_URL}/series?name=${searchTerm}`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const results = $('.c-tabs-item__content').toArray().map((el) => {
                var _a, _b, _c;
                const title = $('.post-title h3', el).text().trim();
                const id = (_b = (_a = $('.post-title h3 a', el).attr('href')) === null || _a === void 0 ? void 0 : _a.split('/').slice(-2, -1)[0]) !== null && _b !== void 0 ? _b : '';
                const image = (_c = $('.c-image-hover img', el).attr('src')) !== null && _c !== void 0 ? _c : '';
                return createMangaTile({
                    id,
                    image,
                    title: createIconText({ text: title })
                });
            });
            return createPagedResults({ results });
        });
    }
    ///////////////////////////////
    // Helpers
    ///////////////////////////////
    getChapterIdFromUrl(url) {
        var _a;
        return (_a = url.split('/').slice(-2, -1)[0]) !== null && _a !== void 0 ? _a : '';
    }
}
exports.AsuraScans = AsuraScans;
// Constants for easy maintenance
const ASURA_SELECTORS = {
    manga: {
        title: '.post-title h1',
        image: '.summary_image img',
        status: '.post-content_item:contains("Status") .summary-content'
    },
    chapter: {
        list: '.wp-manga-chapter a'
    }
};

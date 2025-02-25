import {
    Source,
    SourceInfo,
    Manga,
    Chapter,
    ChapterDetails,
    SearchRequest,
    PagedResults,
    MangaTile,
    MangaStatus,
    LanguageCode,
    ContentRating,
    createRequestManager,
    createRequestObject,
    createManga,
    createChapter,
    createChapterDetails,
    createMangaTile,
    createIconText,
    createPagedResults,
    TagSection,
    createTagSection,
    createTag
  } from 'paperback-extensions-common';
  
  export const AsuraScansInfo: SourceInfo = {
    version: '1.0.0',
    name: 'AsuraScans',
    description: 'Unofficial AsuraScans source for Paperback',
    author: 'YourName',
    authorWebsite: 'https://github.com/YourName',
    icon: 'icon.png',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: 'https://asurascans.com',
    sourceTags: []
  };
  
  export class AsuraScans extends Source {
    baseUrl = AsuraScansInfo.websiteBaseURL;
    
    requestManager = createRequestManager({
      requestsPerSecond: 2,
      requestTimeout: 15000
    });
  
    // ---------------------------------------------------------
    // 1) MANGA DETAILS
    // ---------------------------------------------------------
    async getMangaDetails(mangaId: string): Promise<Manga> {
      const request = createRequestObject({
        url: `${this.baseUrl}/manga/${mangaId}/`,
        method: 'GET'
      });
      const response = await this.requestManager.schedule(request, 1);
      const $ = this.cheerio.load(response.data);
  
      // Gather tags properly if needed:
      const tagArray = $('.genres-content a').map((_: any, el: any) => {
        const label = $(el).text().trim();
        return createTag({ id: label, label });
      }).get();
      const tagSection: TagSection[] = [createTagSection({ id: 'genres', label: 'Genres', tags: tagArray })];
  
      const statusText = $('.post-content_item:contains("Status") .summary-content').text().trim().toLowerCase();
      const status = statusText.includes('ongoing')
        ? MangaStatus.ONGOING
        : MangaStatus.COMPLETED;
  
      return createManga({
        id: mangaId,
        titles: [$('.post-title h1').text().trim()],
        image: $('.summary_image img').attr('src') ?? '',
        status,
        author: $('.author-content a').text().trim(),
        artist: $('.artist-content a').text().trim(),
        desc: $('.summary__content p').text().trim(),
        tags: tagSection
      });
    }
  
    // ---------------------------------------------------------
    // 2) CHAPTER LIST
    // ---------------------------------------------------------
    async getChapters(mangaId: string): Promise<Chapter[]> {
      const request = createRequestObject({
        url: `${this.baseUrl}/manga/${mangaId}/`,
        method: 'GET'
      });
      const response = await this.requestManager.schedule(request, 1);
      const $ = this.cheerio.load(response.data);
  
      const chapters: Chapter[] = [];
      $('.wp-manga-chapter a').each((_: any, element: any) => {
        const chapterUrl = $(element).attr('href') ?? '';
        // e.g. https://asurascans.com/manga/SLUG/CHAPTER-ID
        const parts = chapterUrl.split('/').filter((x: any) => x);
        const chapterId = parts.pop() ?? '';
        const name = $(element).text().trim();
        const chapNum = parseFloat(name.match(/\d+/)?.[0] ?? '0');
  
        chapters.push(createChapter({
          id: chapterId,
          mangaId,
          name,
          langCode: LanguageCode.ENGLISH,
          chapNum
        }));
      });
  
      return chapters;
    }
  
    // ---------------------------------------------------------
    // 3) CHAPTER PAGES
    // ---------------------------------------------------------
    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
      const request = createRequestObject({
        url: `${this.baseUrl}/manga/${mangaId}/${chapterId}/`,
        method: 'GET'
      });
      const response = await this.requestManager.schedule(request, 1);
      const $ = this.cheerio.load(response.data);
  
      const pages: string[] = [];
      $('.page-break img').each((_: any, element: any) => {
        const imageUrl = $(element).attr('src') ?? '';
        pages.push(imageUrl);
      });
  
      return createChapterDetails({
        id: chapterId,
        mangaId,
        pages,
        longStrip: true
      });
    }
  
    // ---------------------------------------------------------
    // 4) SEARCH
    // ---------------------------------------------------------
    async getSearchResults(query: SearchRequest, page: number): Promise<PagedResults> {
      const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query.title ?? '')}&post_type=wp-manga`;
      const request = createRequestObject({ url: searchUrl, method: 'GET' });
      const response = await this.requestManager.schedule(request, 1);
      const $ = this.cheerio.load(response.data);
  
      const results: MangaTile[] = [];
      $('.c-tabs-item__content').each((_: any, element: any) => {
        const title = $('.post-title h3', element).text().trim();
        const href = $('.post-title h3 a', element).attr('href') ?? '';
        const id = href.split('/').filter((x: any) => x).pop() ?? '';
        const image = $('.c-image-hover img', element).attr('src') ?? '';
  
        results.push(createMangaTile({
          id,
          image,
          title: createIconText({ text: title })
        }));
      });
  
      return createPagedResults({ results });
    }
  }
  
import { CheerioAPI } from 'cheerio';
import { url } from 'inspector';
import {
  Source,
  SourceInfo,
  Request,
  Manga,
  Chapter,
  ChapterDetails,
  SearchRequest,
  MangaStatus,
  TagSection,
  ContentRating,
  LanguageCode,
  RequestManager,
  PagedResults,
  TagType
} from 'paperback-extensions-common'

const BASE_URL = 'https://reaperscans.com'

export const ReaperscansInfo: SourceInfo = {
  version: '1.0.0',
  name: 'ReaperScans',
  description: 'Extension for ReaperScans',
  author: 'Matthijs07g',
  authorWebsite: 'https://github.com/Matthijs07g',
  icon: 'icon.png',
  contentRating: ContentRating.EVERYONE,
  websiteBaseURL: BASE_URL,
  language: LanguageCode.ENGLISH,
  sourceTags: []
}

export class Reaperscans extends Source {

  constructor(cheerio: CheerioAPI) {
      super(cheerio)
  }

  requestManager: RequestManager = createRequestManager({
    requestsPerSecond: 2,
    requestTimeout: 15000
});
  

  ///////////////////////////////
  // Manga Metadata Fetching
  ///////////////////////////////
  async getMangaDetails(mangaId: string): Promise<Manga> {
    const request : Request = createRequestObject({
      url: `${BASE_URL}/series/${mangaId}/`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add other headers if needed
      }
    })

      const response = await this.requestManager.schedule(request, 1)
      const $ = this.cheerio.load(response.data)

      const titles = [$('.post-title h1').text().trim()]
      const image = $('.summary_image img').attr('src') ?? ''
      const author = $('.author-content a').text().trim()
      const artist = $('.artist-content a').text().trim()
      const desc = $('.summary__content p').text().trim()

      // Status detection
      const statusText = $('.post-content_item:contains("Status") .summary-content')
          .text().trim().toLowerCase()
      let status = MangaStatus.UNKNOWN
      if (statusText.includes('ongoing')) status = MangaStatus.ONGOING
      if (statusText.includes('completed')) status = MangaStatus.COMPLETED

      // Tag handling
      const genres = $('.genres-content a').toArray().map((el: any) => 
          createTag({ id: $(el).text().trim(), label: $(el).text().trim() })
      )
      const tagSections: TagSection[] = [
          createTagSection({ id: 'genres', label: 'Genres', tags: genres })
      ]

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
      })
  }

  ///////////////////////////////
  // Chapter Fetching
  ///////////////////////////////
  async getChapters(mangaId: string): Promise<Chapter[]> {
    const request : Request = createRequestObject(
      {
        url: `${BASE_URL}/series/${mangaId}/`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add other headers if needed
        }
      }
    )

      const response = await this.requestManager.schedule(request, 1)
      const $ = this.cheerio.load(response.data)

      return $('.wp-manga-chapter a').toArray().map((el: any) => {
          const url = $(el).attr('href') ?? ''
          const name = $(el).text().trim()
          const chapNum = parseFloat(name.match(/(\d+\.?\d*)/)?.[1] ?? '0')
          
          return createChapter({
              id: this.getChapterIdFromUrl(url),
              mangaId,
              name,
              langCode: LanguageCode.ENGLISH,
              chapNum,
              time: new Date()  // Add proper date parsing if available
          })
      }).reverse() // Reverse to show latest chapters first
  }

  ///////////////////////////////
  // Page Fetching
  ///////////////////////////////
  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
      const request = createRequestObject({
          url: `${BASE_URL}/manga/${mangaId}/${chapterId}/`,
          method: 'GET'
      })

      const response = await this.requestManager.schedule(request, 1)
      const $ = this.cheerio.load(response.data)

      const pages = $('.reading-content img').toArray().map((el: any) => 
          $(el).attr('data-src')?.trim() ?? $(el).attr('src')?.trim() ?? ''
      ).filter((url: string | any[]) => url.length > 0)

      return createChapterDetails({
          id: chapterId,
          mangaId,
          pages,
          longStrip: true
      })
  }

  ///////////////////////////////
  // Search Implementation    
  ///////////////////////////////
  async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
      const searchTerm = query.title?.replace(/ /g, '+') ?? '%20'
      const request : Request = createRequestObject(
          {
            url: `${BASE_URL}/series?name=${searchTerm}`,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
          }
      })

      const response = await this.requestManager.schedule(request, 1)
      const $ = this.cheerio.load(response.data)

      const results = $('.c-tabs-item__content').toArray().map((el: any) => {
          const title = $('.post-title h3', el).text().trim()
          const id = $('.post-title h3 a', el).attr('href')?.split('/').slice(-2, -1)[0] ?? ''
          const image = $('.c-image-hover img', el).attr('src') ?? ''

          return createMangaTile({
              id,
              image,
              title: createIconText({ text: title })
          })
      })

      return createPagedResults({ results })
  }

  ///////////////////////////////
  // Helpers
  ///////////////////////////////
  private getChapterIdFromUrl(url: string): string {
      return url.split('/').slice(-2, -1)[0] ?? ''
  }
}

// Interface for cleaner selector management
interface AsuraSelectors {
  manga: {
      title: string
      image: string
      status: string
      // ... other selectors
  }
  chapter: {
      list: string
      // ... other selectors
  }
}

// Constants for easy maintenance
const ASURA_SELECTORS: AsuraSelectors = {
  manga: {
      title: '.post-title h1',
      image: '.summary_image img',
      status: '.post-content_item:contains("Status") .summary-content'
  },
  chapter: {
      list: '.wp-manga-chapter a'
  }
}
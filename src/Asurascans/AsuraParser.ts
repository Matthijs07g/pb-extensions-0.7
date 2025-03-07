import { CheerioAPI } from "cheerio";
import { HomeSection, HomeSectionType, MangaTile } from "paperback-extensions-common";
import { decode } from "html-entities";
import { get } from "http";
export const parseHomeSections = async (
  source: any,
  $: CheerioAPI,
  sectionCallback: (section: HomeSection) => void
): Promise<void> => {
  try {
      // Create featured section...
      const featuredSection = createHomeSection({
        id: 'featured',
        title: 'Featured',
        type: HomeSectionType.singleRowLarge
    });

    const featuredItems: MangaTile[] = [];
    try {
        const featuredElements = $('li.slide', 'ul.slider.animated').toArray();
        for (const manga of featuredElements) {
          const slug = $('a', manga).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? '';
          if(!slug) continue
          const id = await getMangaId(source, slug);

          const title: string = $('a', manga).text().trim() ?? '';
          const image: string = $('img', manga).attr('src') ?? '';
            
            featuredItems.push(
                createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({text: title})
                })
            );
        }
        featuredSection.items = featuredItems;
        sectionCallback(featuredSection);
    } catch (err) {
        console.error('Error parsing featured section:', err);
    }

    const latestSection = createHomeSection({
      id: 'latest_updates',
      title: 'Latest Updates',
      type: HomeSectionType.singleRowNormal
    });

    const latestItems: MangaTile[] = [];
    try {
      const updateElements = $('div.w-full', 'div.grid.grid-rows-1').toArray();
      for (const manga of updateElements) {
          const slug = $('a', manga).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? '';
          if(!slug) continue
          const id = await getMangaId(source, slug);

          const title: string = $('.col-span-9 > .font-medium > a', manga).first().text().trim() ?? '';
          const image: string = $('img', manga).first().attr('src') ?? '';

          let subtitle: string =
            $('.flex.flex-col .flex-row a', manga).first().text().trim() ?? ''
          let subtitleContext: string =
            $('p.flex.items-end', manga).text().trim() ?? ''
          if (subtitleContext.indexOf('Public in') !== -1) {
            subtitle = '(Early Access) ' + subtitle
          }
          
          latestItems.push(
              createMangaTile({
                  id: id,
                  image: image,
                  title: createIconText({text: decode(title)}),
                  subtitleText: createIconText({text: decode(subtitle)})
              })
          );
      }
      latestSection.items = latestItems;
      sectionCallback(latestSection);
    } catch (err) {
      console.error('Error parsing latest section:', err);
    }

      // Popular Section
      const popularSection = createHomeSection({
        id: 'popular_today',
        title: 'Popular Today',
        type: HomeSectionType.singleRowNormal
    });

    const popularItems: MangaTile[] = [];
    try {
        const popularElements = $('a', 'div.flex-wrap.hidden').toArray();
        for (const manga of popularElements) {
            const slug = $('a', manga).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? '';
            if(!slug) continue
            const id = await getMangaId(source, slug);

            const title: string = $('span.block.font-bold', manga).first().text().trim() ?? '';
            const image: string = $('img', manga).first().attr('src') ?? '';
            const subtitle: string = $('span.block.font-bold', manga).first().next().text().trim() ?? '';
            
            popularItems.push(
                createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({text: decode(title)}),
                    subtitleText: createIconText({text: decode(subtitle)})
                })
            );
        }
        popularSection.items = popularItems;
        sectionCallback(popularSection);
    } catch (err) {
        console.error('Error parsing popular section:', err);
    }

  } catch (err) {
    console.error('Error in parseHomeSections:', err);
    throw err;
  }

};

export const parseViewMore = async (
  source: any,
  $: CheerioAPI
): Promise<MangaTile[]> => {
  const manga: MangaTile[] = []
  const collectedIds: string[] = []

  for (const item of $('a', 'div.grid.grid-cols-2').toArray()) {
      const slug =
          $(item).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? ''
      if (!slug) continue

      const id = await getMangaId(source, slug)

      const image: string = $('img', item).first().attr('src') ?? ''
      const title: string =
          $('span.block.font-bold', item).first().text().trim() ?? ''
      const subtitle: string =
          $('span.block.font-bold', item).first().next().text().trim() ?? ''

      if (!id || !title || collectedIds.includes(id)) continue
      manga.push(
          createMangaTile({
              id: id,
              image: image,
              title: {
                  text: decode(title)
              },
              subtitleText: {
                  text: decode(subtitle)
              }
          })
      )
      collectedIds.push(id)
  }
  return manga
}


export const isLastPage = ($: CheerioAPI): boolean => {
  let isLast = true;
  const hasItems = $('a', 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 p-4').toArray().length > 0

  if (hasItems) isLast = false
  return isLast
}

function getMangaId(source: any, slug: string): string {
  const id = cleaner(slug) + '-'
  return id
}

function cleaner(str: string): string {
  let id: string | null = str
  id = id.replace(/\/$/, '');
  id = id.split('/').pop() ?? null
  id = id?.substring(0, id?.lastIndexOf('-')) ?? null

  if(!id) throw new Error(`Failed to parse ID for: ${str}`)
  return id
  
}
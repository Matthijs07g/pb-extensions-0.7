export const parseHomeSections = async (
    source: any,
    $: CheerioAPI,
    sectionCallback: (section: HomeSection) => void
  ): Promise<void> => {
    // Create the Featured section
    const featuredSection = App.createHomeSection({
      id: 'featured',
      title: 'Featured',
      containsMoreItems: false,
      type: HomeSectionType.singleRowLarge
    });
  
    // Create the Latest Updates section
    const updateSection = App.createHomeSection({
      id: 'latest_updates',
      title: 'Latest Updates',
      containsMoreItems: true,
      type: HomeSectionType.singleRowNormal
    });
  
    // Create the Popular Today section
    const popularSection = App.createHomeSection({
      id: 'popular_today',
      title: 'Popular Today',
      containsMoreItems: false,
      type: HomeSectionType.singleRowNormal
    });
  
    // ----------------
    // Parse Featured Section
    // ----------------
    const featuredSectionArray: PartialSourceManga[] = [];
    // Select each slide item in the featured slider
    for (const manga of $('li.slide', 'ul.slider.animated').toArray()) {
      // Extract the slug from the link's URL
      const slug = $('a', manga)
        .attr('href')
        ?.replace(/\/$/, '')
        ?.split('/')
        .pop() ?? '';
      if (!slug) continue;
  
      // Resolve the manga ID from the source
      const id = await getMangaId(source, slug);
      const image: string = $('img', manga).first().attr('src') ?? '';
      const title: string = $('a', manga).first().text().trim() ?? '';
  
      if (!id || !title) continue;
      featuredSectionArray.push(
        App.createPartialSourceManga({
          image,
          title: decodeHTMLEntity(title),
          mangaId: id
        })
      );
    }
    featuredSection.items = featuredSectionArray;
    sectionCallback(featuredSection);
  
    // ----------------
    // Parse Latest Updates Section
    // ----------------
    const updateSectionArray: PartialSourceManga[] = [];
    // Select each manga item in the updates grid
    for (const manga of $('div.w-full', 'div.grid.grid-rows-1').toArray()) {
      const slug = $('a', manga)
        .attr('href')
        ?.replace(/\/$/, '')
        ?.split('/')
        .pop() ?? '';
      if (!slug) continue;
  
      const id = await getMangaId(source, slug);
      const image: string = $('img', manga).first().attr('src') ?? '';
      const title: string =
        $('.col-span-9 > .font-medium > a', manga).first().text().trim() ?? '';
      let subtitle: string =
        $('.flex.flex-col .flex-row a', manga).first().text().trim() ?? '';
      let subtitleContext: string =
        $('p.flex.items-end', manga).text().trim() ?? '';
  
      // If the subtitle context contains a specific phrase, adjust the subtitle accordingly
      if (subtitleContext.indexOf('Public in') !== -1) {
        subtitle = '(Early Access) ' + subtitle;
      }
  
      if (!id || !title) continue;
      updateSectionArray.push(
        App.createPartialSourceManga({
          image,
          title: decodeHTMLEntity(title),
          mangaId: id,
          subtitle: decodeHTMLEntity(subtitle)
        })
      );
    }
    updateSection.items = updateSectionArray;
    sectionCallback(updateSection);
  
    // ----------------
    // Parse Popular Today Section
    // ----------------
    const popularSectionArray: PartialSourceManga[] = [];
    // Select each manga item in the popular section
    for (const manga of $('a', 'div.flex-wrap.hidden').toArray()) {
      const slug = $(manga)
        .attr('href')
        ?.replace(/\/$/, '')
        ?.split('/')
        .pop() ?? '';
      if (!slug) continue;
  
      const id = await getMangaId(source, slug);
      const image: string = $('img', manga).first().attr('src') ?? '';
      const title: string =
        $('span.block.font-bold', manga).first().text().trim() ?? '';
      const subtitle: string =
        $('span.block.font-bold', manga).first().next().text().trim() ?? '';
  
      if (!id || !title) continue;
      popularSectionArray.push(
        App.createPartialSourceManga({
          image,
          title: decodeHTMLEntity(title),
          mangaId: id,
          subtitle: decodeHTMLEntity(subtitle)
        })
      );
    }
    popularSection.items = popularSectionArray;
    sectionCallback(popularSection);
  };
  
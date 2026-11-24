// =====================================================
// PERSONAL ACADEMIC PROFILE
// =====================================================
const profile = {
    email: 'sandeepsingh26091999@gmail.com',
    linkedin: 'https://www.linkedin.com/in/sandeep-singh-b95554246/',
    scholar: 'https://scholar.google.com/citations?user=YD6DY2IAAAAJ&hl=en',
    orcid: 'https://orcid.org/0009-0004-6835-5702',
    cv: 'cv.pdf'
};
// =====================================================
// ADD YOUR PUBLICATION DOIs HERE
// =====================================================
const publicationDOIs = [
    '10.1109/LWC.2024.3424332',
    '10.1109/JIOT.2025.3551856',
    '10.1109/JIOT.2024.3515964',
    '10.1109/JIOT.2025.3567373',
    '10.1109/VTC2024-Fall63153.2024.10757924',
    '10.1109/TWC.2026.3665583',
    '10.1109/TVT.2026.3681734',
    '10.1109/LWC.2026.3677379',
    '10.1109/WCNC65185.2026.11555244',
    '10.1109/GLOBECOM59602.2025.11432142',
    '10.1109/GLOBECOM59602.2025.11432578',
    '10.1109/ISMAC65024.2025.11175934',
    '10.1109/ICC52391.2025.11162006',
    '10.1109/ICCWorkshops67674.2025.11162341'
];
// =====================================================
// OPTIONAL MANUAL METADATA CORRECTIONS
// =====================================================
// Use this only if Crossref provides incorrect or
// incomplete publication information.
const publicationOverrides = {
    /*
    '10.1109/your-doi': {
        type: 'journal',
        title: 'Correct Publication Title',
        authors: 'Sandeep Singh, A. Author',
        venue: 'Correct Journal Name',
        year: 2026,
        paper: 'papers/paper.pdf',
        code: 'https://github.com/your-code'
    }
    */
};
// =====================================================
// PUBLICATION STORAGE
// =====================================================
let publications = [];
let journalPublications = [];
let conferencePublications = [];
let otherPublications = [];
// =====================================================
// CROSSREF API CONFIGURATION
// =====================================================
const CROSSREF_API =
    'https://api.crossref.org/works/';
const CACHE_PREFIX =
    'academic-publication-v1-';
const CACHE_DURATION =
    7 * 24 * 60 * 60 * 1000;
// =====================================================
// NORMALIZE DOI
// =====================================================
function normalizeDOI(doi) {
    return String(doi)
        .trim()
        .replace(
            /^https?:\/\/(dx\.)?doi\.org\//i,
            ''
        )
        .replace(/^doi:\s*/i, '')
        .toLowerCase();
}
// =====================================================
// GENERATE DOI URL
// =====================================================
function createDOILink(doi) {
    return 'https://doi.org/' +
        doi.split('/').map(
            encodeURIComponent
        ).join('/');
}
// =====================================================
// DETECT PUBLICATION TYPE
// =====================================================
function getPublicationType(type) {
    if (type === 'journal-article') {
        return 'journal';
    }
    if (type === 'proceedings-article') {
        return 'conference';
    }
    if (type === 'posted-content') {
        return 'preprint';
    }
    return 'other';
}
// =====================================================
// EXTRACT PUBLICATION YEAR
// =====================================================
function getPublicationYear(data) {
    const year =
        data.published?.['date-parts']?.[0]?.[0] ??
        data['published-print']?.['date-parts']?.[0]?.[0] ??
        data['published-online']?.['date-parts']?.[0]?.[0] ??
        data.issued?.['date-parts']?.[0]?.[0] ??
        null;
    return Number.isInteger(year) ? year : null;
}
// =====================================================
// EXTRACT AUTHOR NAMES
// =====================================================
function getAuthors(data) {
    if (!Array.isArray(data.author)) {
        return 'Author information unavailable';
    }
    const authors = data.author.map(author => {
        const givenName = author.given || '';
        const familyName = author.family || '';
        return author.name ||
            `${givenName} ${familyName}`.trim();
    }).filter(Boolean);
    return authors.join(', ') ||
        'Author information unavailable';
}
// =====================================================
// GENERATE JOURNAL / CONFERENCE CITATION
// =====================================================
function getVenue(data, year, type) {
    const venueParts = [];
    const venue =
        data['container-title']?.[0] ||
        data.event?.name ||
        data.publisher ||
        'Publication venue unavailable';
    venueParts.push(venue);
    // Volume number
    if (data.volume) {
        venueParts.push(
            `vol. ${data.volume}`
        );
    }
    // Issue number
    if (data.issue) {
        venueParts.push(
            `no. ${data.issue}`
        );
    }
    // Page numbers or article number
    if (data.page) {
        venueParts.push(
            `pp. ${data.page}`
        );
    } else if (data['article-number']) {
        venueParts.push(
            `Art. no. ${data['article-number']}`
        );
    }
    // Conference location, if available
    if (
        type === 'conference' &&
        data.event?.location
    ) {
        venueParts.push(
            data.event.location
        );
    }
    // Publication year
    if (year) {
        venueParts.push(year);
    }
    return venueParts.join(', ') + '.';
}
// =====================================================
// READ CACHED PUBLICATION
// =====================================================
function readCachedPublication(doi) {
    try {
        const cached = localStorage.getItem(
            CACHE_PREFIX + doi
        );
        if (!cached) {
            return null;
        }
        const result = JSON.parse(cached);
        if (!result.data || !result.timestamp) {
            return null;
        }
        return {
            data: result.data,
            fresh:
                Date.now() - result.timestamp
                < CACHE_DURATION
        };
    } catch (error) {
        return null;
    }
}
// =====================================================
// SAVE PUBLICATION IN CACHE
// =====================================================
function saveCachedPublication(doi, publication) {
    try {
        localStorage.setItem(
            CACHE_PREFIX + doi,
            JSON.stringify({
                timestamp: Date.now(),
                data: publication
            })
        );
    } catch (error) {
        // Continue even if browser storage is unavailable.
        console.warn(
            'Publication cache unavailable.'
        );
    }
}
// =====================================================
// APPLY OPTIONAL MANUAL CORRECTIONS
// =====================================================
function applyOverrides(publication, doi) {
    return {
        ...publication,
        ...(publicationOverrides[doi] || {})
    };
}
// =====================================================
// FETCH PUBLICATION FROM CROSSREF
// =====================================================
async function fetchPublication(doi) {
    doi = normalizeDOI(doi);
    // Check whether DOI format is valid
    if (!/^10\.\d{4,9}\/\S+$/i.test(doi)) {
        throw new Error(
            'Invalid DOI: ' + doi
        );
    }
    // Check cached publication
    const cached = readCachedPublication(doi);
    if (cached?.fresh) {
        return applyOverrides(
            cached.data,
            doi
        );
    }
    // Request timeout
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        15000
    );
    try {
        // Crossref API URL
        const url =
            CROSSREF_API +
            encodeURIComponent(doi);
        // Retrieve publication information
        const response = await fetch(url, {
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(
                `Crossref HTTP ${response.status}`
            );
        }
        const result = await response.json();
        const data = result.message;
        if (!data || !data.DOI) {
            throw new Error(
                'Publication metadata unavailable'
            );
        }
        // Extract publication information
        const type = getPublicationType(
            data.type
        );
        const year = getPublicationYear(data);
        const authors = getAuthors(data);
        const venue = getVenue(
            data,
            year,
            type
        );
        const publication = {
            type: type,
            year: year,
            title:
                data.title?.[0] ||
                'Publication title unavailable',
            authors: authors,
            venue: venue,
            doi: createDOILink(
                data.DOI || doi
            ),
            publisher: data.publisher || '',
            paper: '',
            code: '',
            citations:
                data['is-referenced-by-count'] ?? null
        };
        // Store metadata for future visits
        saveCachedPublication(
            doi,
            publication
        );
        return applyOverrides(
            publication,
            doi
        );
    } catch (error) {
        // Use older cached information if Crossref
        // is temporarily unavailable.
        if (cached?.data) {
            console.warn(
                'Using cached publication:',
                doi
            );
            return applyOverrides(
                cached.data,
                doi
            );
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
// =====================================================
// LOAD ALL PUBLICATIONS USING DOIs
// =====================================================
async function loadPublications() {
    publications = [];
    journalPublications = [];
    conferencePublications = [];
    otherPublications = [];
    // Remove duplicate and empty DOI entries
    const uniqueDOIs = [
        ...new Set(
            publicationDOIs
                .map(normalizeDOI)
                .filter(Boolean)
        )
    ];
    const failedDOIs = [];
    // Retrieve publications sequentially
    for (const doi of uniqueDOIs) {
        try {
            const publication =
                await fetchPublication(doi);
            publications.push(publication);
            // Automatically classify journal papers
            if (publication.type === 'journal') {
                journalPublications.push(
                    publication
                );
            }
            // Automatically classify conference papers
            else if (
                publication.type === 'conference'
            ) {
                conferencePublications.push(
                    publication
                );
            }
            // Preprints and other publication types
            else {
                otherPublications.push(
                    publication
                );
            }
        } catch (error) {
            failedDOIs.push(doi);
            console.error(
                'Unable to retrieve publication:',
                doi,
                error.message
            );
        }
    }
    // Sort publications from newest to oldest
    const sortByYear = (a, b) =>
        (b.year || 0) - (a.year || 0);
    publications.sort(sortByYear);
    journalPublications.sort(sortByYear);
    conferencePublications.sort(sortByYear);
    otherPublications.sort(sortByYear);
    return failedDOIs;
}
// =====================================================
// HIGHLIGHT YOUR NAME IN AUTHOR LIST
// =====================================================
function formatAuthors(authors) {
    const paragraph = document.createElement('p');
    paragraph.className = 'publication-authors';
    const authorParts = String(authors).split(
        /(\bSandeep Singh\b|\bS\.\s*Singh\b)/gi
    );
    authorParts.forEach(part => {
        if (
            /^(Sandeep Singh|S\.\s*Singh)$/i.test(part)
        ) {
            const strong =
                document.createElement('strong');
            strong.textContent = part;
            paragraph.appendChild(strong);
        } else {
            paragraph.appendChild(
                document.createTextNode(part)
            );
        }
    });
    return paragraph;
}
// =====================================================
// CREATE PUBLICATION LINKS
// =====================================================
function createPublicationLinks(publication) {
    const links = document.createElement('div');
    links.className =
        'publication-links pub-links';
    const availableLinks = [
        ['doi', 'DOI'],
        ['paper', 'Paper'],
        ['code', 'Code']
    ];
    for (const [key, label] of availableLinks) {
        if (publication[key]) {
            const link =
                document.createElement('a');
            link.href = publication[key];
            link.textContent = label + ' ↗';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            links.appendChild(link);
        }
    }
    return links;
}
// =====================================================
// CREATE INDIVIDUAL PUBLICATION RECORD
// =====================================================
function createPublicationItem(
    publication,
    index,
    prefix
) {
    const article =
        document.createElement('article');
    article.className =
        'publication-item publication';
    // Publication number
    const number =
        document.createElement('div');
    number.className =
        'publication-number';
    number.textContent =
        `[${prefix}${index + 1}]`;
    // Publication details
    const details =
        document.createElement('div');
    details.className =
        'publication-details';
    // Publication title
    const title =
        document.createElement('h4');
    title.className =
        'publication-title';
    title.textContent =
        publication.title;
    // Author names with your name in bold
    const authors =
        formatAuthors(publication.authors);
    // Journal or conference information
    const venue =
        document.createElement('p');
    venue.className =
        'publication-venue';
    venue.textContent =
        publication.venue;
    // DOI, paper and code links
    const links =
        createPublicationLinks(publication);
    // Combine publication details
    details.append(
        title,
        authors,
        venue,
        links
    );
    article.append(
        number,
        details
    );
    return article;
}
// =====================================================
// DISPLAY INDIVIDUAL PUBLICATION CATEGORY
// =====================================================
function renderPublicationCategory(
    records,
    list,
    prefix,
    query = ''
) {
    if (!list) {
        return;
    }
    list.replaceChildren();
    // Keep numbering consistent during searches
    const matchingPublications = records
        .map((publication, index) => ({
            publication,
            index
        }))
        .filter(({ publication }) => {
            return [
                publication.title,
                publication.authors,
                publication.venue,
                publication.year,
                publication.doi
            ]
            .join(' ')
            .toLowerCase()
            .includes(query);
        });
    // Empty publication category
    if (matchingPublications.length === 0) {
        const message =
            document.createElement('p');
        message.className = 'empty';
        message.textContent = records.length
            ? 'No publications match your search.'
            : 'No publications available.';
        list.appendChild(message);
        return;
    }
    // Display matching publications
    for (const item of matchingPublications) {
        const article = createPublicationItem(
            item.publication,
            item.index,
            prefix
        );
        list.appendChild(article);
    }
}
// =====================================================
// CREATE SEPARATE PUBLICATION SECTIONS IF REQUIRED
// =====================================================
// Supports both the original HTML and the updated HTML.
function createPublicationSections() {
    let journalList =
        document.getElementById('journal-list');
    let conferenceList =
        document.getElementById('conference-list');
    let otherList =
        document.getElementById('other-list');
    // If updated HTML already contains separate lists
    if (journalList && conferenceList) {
        if (!otherList) {
            const section = document.createElement('div');
            section.id = 'other-publications';
            section.className = 'publication-category';
            section.hidden = true;
            const heading = document.createElement('h3');
            heading.className = 'publication-heading';
            heading.textContent = 'Other Publications';
            otherList = document.createElement('div');
            otherList.id = 'other-list';
            section.append(heading, otherList);
            document.getElementById('publications')
                ?.appendChild(section);
        }
        return {
            journalList,
            conferenceList,
            otherList
        };
    }
    // Support the original single-list HTML
    const originalList =
        document.getElementById('publication-list');
    if (!originalList) {
        return null;
    }
    originalList.replaceChildren();
    function createCategory(
        headingText,
        sectionId,
        listId
    ) {
        const section =
            document.createElement('div');
        section.className =
            'publication-category';
        section.id = sectionId;
        const heading =
            document.createElement('h3');
        heading.className =
            'publication-heading';
        heading.textContent = headingText;
        const list =
            document.createElement('div');
        list.id = listId;
        section.append(heading, list);
        originalList.appendChild(section);
        return list;
    }
    journalList = createCategory(
        'Journal Publications',
        'journal-publications',
        'journal-list'
    );
    conferenceList = createCategory(
        'Conference Publications',
        'conference-publications',
        'conference-list'
    );
    otherList = createCategory(
        'Other Publications',
        'other-publications',
        'other-list'
    );
    otherList.parentElement.hidden = true;
    return {
        journalList,
        conferenceList,
        otherList
    };
}
// =====================================================
// UPDATE PUBLICATION COUNTERS
// =====================================================
function updatePublicationCounters() {
    const journalCount =
        document.getElementById('journal-count');
    const conferenceCount =
        document.getElementById('conference-count');
    const totalCount =
        document.getElementById('publication-count');
    if (journalCount) {
        journalCount.textContent =
            journalPublications.length;
    }
    if (conferenceCount) {
        conferenceCount.textContent =
            conferencePublications.length;
    }
    if (totalCount) {
        totalCount.textContent =
            publications.length;
    }
}
// =====================================================
// INITIALIZE WEBSITE
// =====================================================
async function initializeWebsite() {
    // =================================================
    // MOBILE NAVIGATION MENU
    // =================================================
    const menu =
        document.querySelector('#menu');
    const nav =
        document.querySelector('#nav-links');
    if (menu && nav) {
        menu.addEventListener('click', () => {
            const open =
                nav.classList.toggle('open');
            menu.setAttribute(
                'aria-expanded',
                String(open)
            );
        });
        nav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                nav.classList.remove('open');
                menu.setAttribute(
                    'aria-expanded',
                    'false'
                );
            });
        });
    }
    // =================================================
    // AUTOMATIC COPYRIGHT YEAR
    // =================================================
    const yearElement =
        document.querySelector('#year');
    if (yearElement) {
        yearElement.textContent =
            new Date().getFullYear();
    }
    // =================================================
    // ACADEMIC PROFILE LINKS
    // =================================================
    document.querySelectorAll('[data-profile]')
        .forEach(a => {
            const key = a.dataset.profile;
            const value = profile[key];
            if (value) {
                if (key === 'email') {
                    a.href =
                        'https://mail.google.com/mail/?view=cm&fs=1&to='
                        + encodeURIComponent(value);
                    a.title =
                        'Send me an email via Gmail';
                    if (a.closest('#contact')) {
                        a.textContent = value;
                    }
                } else {
                    a.href = value;
                    const titles = {
                        linkedin:
                            'View LinkedIn Profile',
                        scholar:
                            'View Google Scholar Profile',
                        orcid:
                            'View ORCID Profile',
                        cv:
                            'View Curriculum Vitae'
                    };
                    a.title = titles[key] || '';
                }
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            } else {
                a.dataset.unconfigured = 'true';
                a.title =
                    'Profile link not configured yet';
                a.addEventListener('click', e => {
                    e.preventDefault();
                    alert(
                        'This academic link has not been '
                        + 'added yet. Edit script.js.'
                    );
                });
            }
        });
    // =================================================
    // CREATE PUBLICATION SECTIONS
    // =================================================
    const sections =
        createPublicationSections();
    if (!sections) {
        return;
    }
    const {
        journalList,
        conferenceList,
        otherList
    } = sections;
    // =================================================
    // DISPLAY LOADING MESSAGE
    // =================================================
    journalList.textContent =
        'Loading journal publications...';
    conferenceList.textContent =
        'Loading conference publications...';
    // =================================================
    // PUBLICATION SEARCH AND FILTERING
    // =================================================
    let filter = 'all';
    const search =
        document.querySelector('#search');
    const filterButtons =
        document.querySelectorAll('[data-filter]');
    // =================================================
    // RETRIEVE ALL PUBLICATION METADATA
    // =================================================
    const failedDOIs =
        await loadPublications();
    // =================================================
    // RENDER PUBLICATIONS
    // =================================================
    function render() {
        const query = search
            ? search.value.trim().toLowerCase()
            : '';
        // Journal publication section
        journalList.parentElement.hidden =
            filter !== 'all' &&
            filter !== 'journal';
        renderPublicationCategory(
            journalPublications,
            journalList,
            'J',
            query
        );
        // Conference publication section
        conferenceList.parentElement.hidden =
            filter !== 'all' &&
            filter !== 'conference';
        renderPublicationCategory(
            conferencePublications,
            conferenceList,
            'C',
            query
        );
        // Other publication types
        if (otherList) {
            const showOther =
                otherPublications.length > 0 &&
                (
                    filter === 'all' ||
                    filter === 'preprint' ||
                    filter === 'other'
                );
            otherList.parentElement.hidden =
                !showOther;
            const records =
                filter === 'all'
                    ? otherPublications
                    : otherPublications.filter(
                        p => p.type === filter
                    );
            renderPublicationCategory(
                records,
                otherList,
                'P',
                query
            );
        }
        updatePublicationCounters();
    }
    // =================================================
    // PUBLICATION FILTER BUTTONS
    // =================================================
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filter = button.dataset.filter;
            filterButtons.forEach(item => {
                item.setAttribute(
                    'aria-pressed',
                    String(item === button)
                );
            });
            render();
        });
    });
    // =================================================
    // PUBLICATION SEARCH INPUT
    // =================================================
    if (search) {
        search.addEventListener(
            'input',
            render
        );
    }
    // =================================================
    // DISPLAY ALL PUBLICATIONS
    // =================================================
    render();
    // =================================================
    // REPORT FAILED DOI REQUESTS
    // =================================================
    if (failedDOIs.length > 0) {
        const warning =
            document.createElement('div');
        warning.className =
            'publication-warning';
        const heading =
            document.createElement('p');
        heading.textContent =
            'Some publication details could not be '
            + 'retrieved. DOI links are provided below.';
        warning.appendChild(heading);
        const list =
            document.createElement('ul');
        failedDOIs.forEach(doi => {
            const item =
                document.createElement('li');
            item.textContent = doi;
            if (/^10\.\d{4,9}\/\S+$/i.test(doi)) {
                const link =
                    document.createElement('a');
                link.href = createDOILink(doi);
                link.textContent = ' — Open DOI ↗';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                item.appendChild(link);
            }
            list.appendChild(item);
        });
        warning.appendChild(list);
        document.getElementById('publications')
            ?.appendChild(warning);
    }
}
// =====================================================
// START WEBSITE
// =====================================================
function startWebsite() {
    initializeWebsite().catch(error => {
        console.error(
            'Website initialization error:',
            error
        );
    });
}
if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        startWebsite
    );
} else {
    startWebsite();
}
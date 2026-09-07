import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SEO_CONSTANTS } from '../../constants/seo';
import { isPrivateSeoPath, normalizeSeoPath } from '../../constants/seoRoutes';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    canonical?: string;
    robots?: string;
    structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

export const SEO: React.FC<SEOProps> = ({
    title,
    description,
    keywords,
    image,
    url,
    canonical,
    robots,
    structuredData
}) => {
    const location = useLocation();
    const titleHasBrand = /Milkyway Japan|モンゴリア銀河系|モンゴル銀河旅行社/i.test(title || '');
    const metaTitle = title
        ? (titleHasBrand ? title : `${title} | Milkyway Japan`)
        : SEO_CONSTANTS.TITLE;

    const metaDescription = description || SEO_CONSTANTS.DESCRIPTION;
    const metaKeywords = keywords || SEO_CONSTANTS.KEYWORDS;
    const metaImage = image ? (image.startsWith('http') ? image : `${SEO_CONSTANTS.SITE_URL}${image}`) : `${SEO_CONSTANTS.SITE_URL}${SEO_CONSTANTS.OG_IMAGE}`;
    const resolvedPath = normalizeSeoPath(canonical || url || location.pathname);
    const canonicalUrl = resolvedPath === '/' ? `${SEO_CONSTANTS.SITE_URL}/` : `${SEO_CONSTANTS.SITE_URL}${resolvedPath}`;
    const metaUrl = canonicalUrl;
    const metaRobots = robots || (isPrivateSeoPath(location.pathname) ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large');

    // Normalize structuredData to always be an array
    const structuredDataArray = structuredData
        ? (Array.isArray(structuredData) ? structuredData : [structuredData])
        : [];

    return (
        <Helmet htmlAttributes={{ lang: 'ja' }}>
            <title>{metaTitle}</title>
            <meta name="description" content={metaDescription} />
            <meta name="keywords" content={metaKeywords} />
            <meta name="robots" content={metaRobots} />

            {/* Canonical URL */}
            <link rel="canonical" href={canonicalUrl} />
            <link rel="alternate" hrefLang="ja" href={canonicalUrl} />
            <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:locale" content="ja_JP" />
            <meta property="og:url" content={metaUrl} />
            <meta property="og:title" content={metaTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:site_name" content="Milkyway Japan" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={metaUrl} />
            <meta name="twitter:title" content={metaTitle} />
            <meta name="twitter:description" content={metaDescription} />
            <meta name="twitter:image" content={metaImage} />

            {/* Structured Data (JSON-LD) — supports single or multiple schemas */}
            {structuredDataArray.map((data, index) => (
                <script key={`jsonld-${index}`} type="application/ld+json">
                    {JSON.stringify(data)}
                </script>
            ))}
        </Helmet>
    );
};


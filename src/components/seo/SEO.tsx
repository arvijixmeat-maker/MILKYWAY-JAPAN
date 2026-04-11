import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SEO_CONSTANTS } from '../../constants/seo';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    canonical?: string;
    structuredData?: Record<string, any> | Record<string, any>[];
}

export const SEO: React.FC<SEOProps> = ({
    title,
    description,
    keywords,
    image,
    url,
    canonical,
    structuredData
}) => {
    const metaTitle = title
        ? `${title} | Milkyway Japan`
        : SEO_CONSTANTS.TITLE;

    const metaDescription = description || SEO_CONSTANTS.DESCRIPTION;
    const metaKeywords = keywords || SEO_CONSTANTS.KEYWORDS;
    const metaImage = image ? (image.startsWith('http') ? image : `${SEO_CONSTANTS.SITE_URL}${image}`) : `${SEO_CONSTANTS.SITE_URL}${SEO_CONSTANTS.OG_IMAGE}`;
    const metaUrl = url ? `${SEO_CONSTANTS.SITE_URL}${url}` : SEO_CONSTANTS.SITE_URL;
    const canonicalUrl = canonical ? `${SEO_CONSTANTS.SITE_URL}${canonical}` : metaUrl;

    // Normalize structuredData to always be an array
    const structuredDataArray = structuredData
        ? (Array.isArray(structuredData) ? structuredData : [structuredData])
        : [];

    return (
        <Helmet htmlAttributes={{ lang: 'ja' }}>
            <title>{metaTitle}</title>
            <meta name="description" content={metaDescription} />
            <meta name="keywords" content={metaKeywords} />

            {/* Canonical URL */}
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:locale" content="ja_JP" />
            <meta property="og:url" content={metaUrl} />
            <meta property="og:title" content={metaTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:site_name" content="Milkyway Japan" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={metaUrl} />
            <meta property="twitter:title" content={metaTitle} />
            <meta property="twitter:description" content={metaDescription} />
            <meta property="twitter:image" content={metaImage} />

            {/* Structured Data (JSON-LD) — supports single or multiple schemas */}
            {structuredDataArray.map((data, index) => (
                <script key={`jsonld-${index}`} type="application/ld+json">
                    {JSON.stringify(data)}
                </script>
            ))}
        </Helmet>
    );
};


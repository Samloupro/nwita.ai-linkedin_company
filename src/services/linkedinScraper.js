import retryFetch from '../utils/retryFetch.js';
import { extractJsonLd, getOrganizationData } from './linkedin/jsonLdProcessor.js';
import { extractCompanyDetails, extractPublications, extractSimilarCompanies } from './linkedin/dataExtractors.js';

export async function scrapeCompanyData(url, requestHeaders, env) {
  // Retrieve ISP proxy credentials from KV binding "PROXY_CREDENTIALS"
  const proxyCredentials = await env.KV_PROXY.get("iproyal");
  if(proxyCredentials){
     console.log("Using proxy ISP:", proxyCredentials);
  }

  const response = await retryFetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)',
      ...(proxyCredentials ? { "X-Proxy": proxyCredentials } : {})
    },
    timeout: 5000
  });
  const finalUrl = response.url;
  const html = await response.text();

  // Extract JSON-LD data
  const { jsonLd, error: jsonLdError } = extractJsonLd(html);
  if (jsonLdError) {
    return { error: jsonLdError };
  }

  // Extract Organization data from JSON-LD
  const { organization, error: orgDataError } = getOrganizationData(jsonLd);
  if (orgDataError) {
    return { error: orgDataError };
  }

  // Extract other company details
  const companyDetails = extractCompanyDetails(html, jsonLd, organization, finalUrl);
  const publications = extractPublications(jsonLd);
  const similarPages = extractSimilarCompanies(html);

  return {
    organization: companyDetails.organization, // Pass organization for consistency
    finalUrl: companyDetails.company_linkedin_url, // Pass finalUrl for consistency
    foundedYear: companyDetails.founded_year,
    specialties: companyDetails.specialties,
    industry: companyDetails.industry,
    headquarters: companyDetails.headquarters,
    fullAddress: companyDetails.company_address.full_address,
    address: companyDetails.company_address, // Pass full address object
    employees: companyDetails.number_of_employees,
    followers: companyDetails.followers,
    publications,
    similarPages
  };
}

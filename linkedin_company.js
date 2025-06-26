import { validateApiKey } from './apiKeyValidation.js';
import retryFetch from './retryFetch.js';

export default {
  async fetch(request, env, ctx) {
    // Validate the API key using KV
    const { error } = await validateApiKey(request, env);
    if (error) {
      return error;
    }

    try {
      let url;
      if (request.method === "POST") {
        const { url: bodyUrl } = await request.json();
        url = bodyUrl;
      } else {
        return new Response(JSON.stringify({ error: "Only POST requests are allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (!url) {
        return new Response(JSON.stringify({ error: "URL is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      url = encodeURI(url);

      // Retrieve ISP proxy credentials from KV binding "PROXY_CREDENTIALS"
      const proxyCredentials = await env.KV_PROXY.get("iproyal");
      if(proxyCredentials){
         console.log("Using proxy ISP:", proxyCredentials);
      }

      // Check cache for existing response
      const cacheKey = new Request(url, { headers: request.headers });
      const cachedResponse = await caches.default.match(cacheKey);
      if (cachedResponse) {
          return cachedResponse;
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

      // Extraction des données JSON-LD
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
      let jsonLd = {};
      if (jsonLdMatch) {
        try {
          jsonLd = JSON.parse(jsonLdMatch[1]);
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid JSON-LD format" }), { status: 400 });
        }
      }

      // Extraction des données de l'entreprise
      const organization = jsonLd['@graph']?.find(item => item['@type'] === 'Organization');
      if (!organization) {
        return new Response(JSON.stringify({ error: "Company data not found" }), { status: 404 });
      }

      // Adresse formatée
      const address = organization.address || {};
      const fullAddress = [
        address.streetAddress,
        address.addressLocality,
        address.postalCode,
        address.addressCountry
      ].filter(part => part).join(', ');

      // Nombre d'employés et extraction des followers
      const employees = organization.numberOfEmployees?.value ?? "";
      let followers = organization.authorSubtitle?.replace(/[^0-9]/g, '') || '';
      if (!followers) {
         // Recherche spécifique dans l'élément affichant le nombre de followers (par exemple, l'en-tête de la page)
         const firstSublineMatch = html.match(/<h3[^>]*class="[^"]*top-card-layout__first-subline[^"]*"[^>]*>(.*?)<\/h3>/i);
         if (firstSublineMatch) {
            const followersMatch = firstSublineMatch[1].match(/([\d,\.]+)\s+followers/i);
            if (followersMatch) {
               followers = followersMatch[1].replace(/,/g, '');
            }
         }
         // Fallback sur l'ensemble du HTML si les followers n'ont toujours pas été extraits
         if (!followers) {
            const followerMatch = html.match(/([\d,\.]+)\s+followers/i);
            followers = followerMatch ? followerMatch[1].replace(/,/g, '') : '0';
         }
      }

      // Extraction des publications récentes
      const publications = jsonLd['@graph']?.filter(item =>
        item['@type'] === 'DiscussionForumPosting'
      )?.map(post => ({
        date: new Date(post.datePublished).toISOString().split('T')[0],
        text: post.text?.trim() || 'No text',
        url: post.mainEntityOfPage || 'No URL'
      })) || [];

      // Extraction de l'année de fondation ("Founded Year") en tant que variable numérique
      const foundedYearMatch = html.match(/<dt[^>]*>\s*Founded\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i);
      const foundedYearText = foundedYearMatch ? foundedYearMatch[1].replace(/<[^>]+>/g, "").trim() : null;
      const foundedYear = foundedYearText ? parseInt(foundedYearText, 10) : null;
      // Extraction des spécialités
      const specialtiesMatch = html.match(/<dt[^>]*>\s*Specialties\s*<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/);
      const specialties = specialtiesMatch ? specialtiesMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      // Extraction de l'industrie
      const industryMatch = html.match(/<dt[^>]*>\s*Industry\s*<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/);
      const industry = industryMatch ? industryMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      // Extraction du siège social (Headquarters)
      const headquartersMatch = html.match(/<dt[^>]*>\s*Headquarters\s*<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/);
      const headquarters = headquartersMatch ? headquartersMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      // Extraction des pages similaires basée sur le paramètre "trk=similar-pages" dans l'URL
      const similarPages = [];
      const links = html.match(/<a[^>]*href="([^"]*trk=similar-pages[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi);
      links?.forEach(linkHtml => {
         // Extraire l'URL du lien
         const urlMatch = linkHtml.match(/href="([^"]*trk=similar-pages[^"]*)"/i);
         const url = urlMatch ? urlMatch[1] : "No URL";
         const cleanUrl = url.split('?')[0];

         // Nettoyer le lien en supprimant les retours à la ligne pour faciliter l'extraction des balises
         const cleanedLink = linkHtml.replace(/\n/g, " ");

         // Essayer d'extraire directement les informations depuis les balises <h3> et <p>
         let name = "No name", industry = "No industry", location = "";
         const h3Match = cleanedLink.match(/<h3[^>]*>(.*?)<\/h3>/i);
         const subtitleMatch = cleanedLink.match(/<p[^>]*class="[^"]*base-aside-card__subtitle[^"]*"[^>]*>(.*?)<\/p>/i);
         const secondSubtitleMatch = cleanedLink.match(/<p[^>]*class="[^"]*base-aside-card__second-subtitle[^"]*"[^>]*>(.*?)<\/p>/i);
         if (h3Match) {
            name = h3Match[1].trim();
            name = name.replace(/<!---->/g, "").replace(/\s+/g, " ").trim();
         }
         if (subtitleMatch) {
            industry = subtitleMatch[1].trim();
         }
         if (secondSubtitleMatch) {
            location = secondSubtitleMatch[1].trim();
         }

         // Si ces informations ne sont pas extraites, fallback en utilisant une expression régulière plus robuste
         if (name === "No name") {
            const fallbackRegex = /([\w ,&\-'’]+)(?:\s*(?:\||-)\s*([\w ,&\-'’]+))?(?:\s*(?:\||-)\s*(.+))?/;
            const fallbackMatch = cleanedLink.match(fallbackRegex);
            if (fallbackMatch) {
               name = fallbackMatch[1] ? fallbackMatch[1].trim() : "No name";
               name = name.replace(/<!---->/g, "").replace(/\s+/g, " ").trim();
               industry = fallbackMatch[2] ? fallbackMatch[2].trim() : "No industry";
               location = fallbackMatch[3] ? fallbackMatch[3].trim() : "";
            } else {
               const strippedText = cleanedLink.replace(/<[^>]+>/g, " ")
                                               .replace(/\s+/g, " ")
                                               .trim();
               name = strippedText.replace(/<!---->/g, "").replace(/\s+/g, " ").trim();
            }
         }
         similarPages.push({ name, industry, location, url: cleanUrl });
      });

      // Construction de la réponse
      const result = {
        "company_info": {
          "company_name": organization.name,
          "company_slogan": organization.slogan || "",
          "company_website": organization.sameAs || "",
          "company_linkedin_url": finalUrl,
          "founded_year": foundedYear,
          "specialties": specialties,
          "industry": industry,
          "headquarters": headquarters,
          "company_address": {
            "full_address": fullAddress,
            "street_address": address.streetAddress || "",
            "address_locality": address.addressLocality || "",
            "postal_code": address.postalCode || "",
            "country": address.addressCountry || ""
          },
          "company_description": organization.description || "",
          "number_of_employees": employees,
          "followers": followers
        },
        "recent_publications": publications,
        "similar_companies": similarPages
      };

      const finalResponse = new Response(JSON.stringify([result], null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      await caches.default.put(cacheKey, finalResponse.clone(), { expirationTtl: 2592000 });
      console.log("Response cached for URL:", url);
      return finalResponse;
    } catch (error) {
      console.error("Worker error:", error, error.type ? "Type: " + error.type : "");
      return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
      });
    }
  }
};

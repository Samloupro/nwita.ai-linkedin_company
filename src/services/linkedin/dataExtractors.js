export function extractCompanyDetails(html, jsonLd, organization, finalUrl) {
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

  return {
    company_name: organization.name,
    company_slogan: organization.slogan || "",
    company_website: organization.sameAs || "",
    company_linkedin_url: finalUrl,
    founded_year: foundedYear,
    specialties: specialties,
    industry: industry,
    headquarters: headquarters,
    company_address: {
      full_address: fullAddress,
      street_address: address.streetAddress || "",
      address_locality: address.addressLocality || "",
      postal_code: address.postalCode || "",
      country: address.addressCountry || ""
    },
    company_description: organization.description || "",
    number_of_employees: employees,
    followers: followers
  };
}

export function extractPublications(jsonLd) {
  const publications = jsonLd['@graph']?.filter(item =>
    item['@type'] === 'DiscussionForumPosting')?.map(post => ({
    date: new Date(post.datePublished).toISOString().split('T')[0],
    text: post.text?.trim() || 'No text',
    url: post.mainEntityOfPage || 'No URL'
  })) || [];
  return publications;
}

export function extractSimilarCompanies(html) {
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
        const fallbackMatch = fallbackRegex.exec(cleanedLink); // Use exec instead of match for capturing groups
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
  return similarPages;
}

export function formatCompanyResponse(scrapedData) {
  const {
    organization,
    finalUrl,
    foundedYear,
    specialties,
    industry,
    headquarters,
    fullAddress,
    address,
    employees,
    followers,
    publications,
    similarPages
  } = scrapedData;

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
  return result;
}

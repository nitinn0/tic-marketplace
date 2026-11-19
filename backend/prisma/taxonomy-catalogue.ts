import type { ServiceCategoryType } from '@prisma/client';

import { slugify } from '../src/modules/taxonomy/utils/slug.util.js';

export type CatalogueService = { slug: string; name: string };
export type CatalogueCategory = {
  slug: string;
  name: string;
  description?: string;
  children?: CatalogueCategory[];
  services?: CatalogueService[];
};
export type CatalogueRoot = CatalogueCategory & { categoryType: ServiceCategoryType };

function services(...names: string[]): CatalogueService[] {
  return names.map((name) => ({ name, slug: slugify(name) }));
}

function sub(name: string, serviceNames: string[], description?: string): CatalogueCategory {
  return {
    slug: slugify(name),
    name,
    description,
    services: services(...serviceNames),
  };
}

/**
 * Marketplace catalogue: root category → subcategory → services.
 * Service slugs are made unique by prefixing the subcategory slug when needed at seed time.
 */
export const MARKETPLACE_CATALOGUE: CatalogueRoot[] = [
  {
    slug: 'testing',
    name: 'Testing',
    categoryType: 'TESTING',
    description:
      'Examination, measurement, analysis or evaluation of products, materials, systems or samples against defined specifications, standards or requirements.',
    children: [
      sub('Chemical Testing', [
        'Chemical composition analysis',
        'Chemical purity testing',
        'Toxic substances testing',
        'Heavy metals testing',
        'Chemical residues testing',
        'RoHS testing',
        'REACH testing',
      ]),
      sub('Environmental Testing', [
        'Air quality testing',
        'Water quality testing',
        'Wastewater testing',
        'Soil testing',
        'Ambient air testing',
        'Indoor air quality testing',
      ]),
      sub('Food Testing', [
        'Food safety testing',
        'Nutritional analysis',
        'Microbiological food testing',
        'Pesticide residue testing',
        'Adulteration testing',
        'Shelf-life testing',
      ]),
      sub('Microbiological Testing', [
        'Bacterial testing',
        'Fungal testing',
        'Pathogen testing',
        'Sterility testing',
        'Microbial contamination testing',
      ]),
      sub('Material Testing', [
        'Metal testing',
        'Plastic testing',
        'Polymer testing',
        'Rubber testing',
        'Cement testing',
        'Concrete testing',
        'Material composition testing',
      ]),
      sub('Mechanical Testing', [
        'Tensile testing',
        'Compression testing',
        'Hardness testing',
        'Impact testing',
        'Fatigue testing',
        'Vibration testing',
      ]),
      sub('Electrical & Electronics Testing', [
        'Electrical safety testing',
        'EMC testing',
        'Electronic component testing',
        'Electrical performance testing',
        'Insulation testing',
      ]),
      sub('Product Testing', [
        'Consumer product testing',
        'Product performance testing',
        'Functional testing',
        'Durability testing',
        'Reliability testing',
      ]),
      sub('Textile Testing', [
        'Fabric testing',
        'Colour fastness testing',
        'Fibre analysis',
        'Textile tensile strength testing',
        'Textile chemical testing',
      ]),
      sub('Automotive Testing', [
        'Vehicle testing',
        'Automotive component testing',
        'Emission testing',
        'Automotive performance testing',
        'Crash-related component testing',
      ]),
      sub('Pharmaceutical Testing', [
        'Drug testing',
        'Pharmaceutical quality testing',
        'Stability testing',
        'Analytical testing',
        'Raw material testing',
      ]),
      sub('Medical Device Testing', [
        'Medical device safety testing',
        'Biocompatibility testing',
        'Medical device performance testing',
        'Medical device electrical safety testing',
        'Sterilization validation',
      ]),
      sub('Packaging Testing', [
        'Packaging strength testing',
        'Packaging compression testing',
        'Leakage testing',
        'Transportation testing',
        'Packaging material testing',
      ]),
      sub('Construction Testing', [
        'Construction soil testing',
        'Aggregate testing',
        'Construction concrete testing',
        'Structural material testing',
        'Asphalt testing',
      ]),
      sub('Cybersecurity Testing', [
        'Vulnerability assessment',
        'Penetration testing',
        'Application security testing',
        'Network security testing',
      ]),
      sub('Energy Testing', [
        'Energy performance testing',
        'Efficiency testing',
        'Power quality testing',
        'Renewable energy equipment testing',
      ]),
      sub('Calibration-related Testing', [
        'Instrument performance testing',
        'Verification testing',
        'Equipment testing',
        'Measurement system testing',
      ]),
      sub('Occupational Testing', [
        'Workplace noise testing',
        'Illumination testing',
        'Ergonomic assessments',
        'Occupational exposure testing',
      ]),
    ],
  },
  {
    slug: 'inspection',
    name: 'Inspection',
    categoryType: 'INSPECTION',
    description:
      'Examination, assessment, verification or evaluation of facilities, products, processes, equipment, projects or operations.',
    children: [
      sub('Industrial Inspection', [
        'Industrial equipment inspection',
        'Machinery inspection',
        'Plant inspection',
        'Process inspection',
      ]),
      sub('Third-Party Inspection (TPI)', [
        'Vendor inspection',
        'Pre-shipment inspection',
        'Final inspection',
        'Source inspection',
      ]),
      sub('Mechanical Inspection', [
        'Mechanical equipment inspection',
        'Pressure equipment inspection',
        'Piping inspection',
        'Structural inspection',
      ]),
      sub('Electrical Inspection', [
        'Electrical installation inspection',
        'Electrical equipment inspection',
        'Electrical safety inspection',
      ]),
      sub('Civil & Structural Inspection', [
        'Building inspection',
        'Structural integrity inspection',
        'Construction quality inspection',
      ]),
      sub('Welding Inspection', ['Weld inspection', 'Welding quality inspection', 'Fabrication inspection']),
      sub('NDT Inspection', [
        'Ultrasonic testing (UT)',
        'Radiographic testing (RT)',
        'Magnetic particle testing (MT)',
        'Dye penetrant testing (PT)',
        'Visual testing (VT)',
      ]),
      sub('Fire & Safety Inspection', [
        'Fire safety inspection',
        'Fire equipment inspection',
        'Emergency preparedness inspection',
      ]),
      sub('Environmental Inspection', [
        'Environmental compliance inspection',
        'Pollution control inspection',
        'Waste management inspection',
      ]),
      sub('Food & Hygiene Inspection', [
        'Food premises inspection',
        'Hygiene inspection',
        'Food processing inspection',
      ]),
      sub('Supplier Inspection', [
        'Supplier assessment',
        'Supplier quality inspection',
        'Supplier compliance inspection',
      ]),
      sub('Pre-Shipment Inspection', [
        'Product inspection',
        'Quantity verification',
        'Packaging inspection',
        'Export inspection',
      ]),
      sub('Container Inspection', ['Container condition inspection', 'Cargo inspection', 'Loading inspection']),
      sub('Lifting Equipment Inspection', [
        'Crane inspection',
        'Hoist inspection',
        'Lift inspection',
        'Rigging equipment inspection',
      ]),
      sub('Pressure Equipment Inspection', [
        'Boiler inspection',
        'Pressure vessel inspection',
        'Pipeline inspection',
      ]),
      sub('Asset Inspection', [
        'Asset condition assessment',
        'Equipment condition assessment',
        'Asset integrity inspection',
      ]),
      sub('Building & Property Inspection', [
        'Commercial building inspection',
        'Residential inspection',
        'Property condition inspection',
      ]),
      sub('Agricultural Inspection', [
        'Crop inspection',
        'Agricultural product inspection',
        'Farm inspection',
      ]),
      sub('Automotive Inspection', [
        'Vehicle inspection',
        'Fleet inspection',
        'Pre-purchase vehicle inspection',
      ]),
      sub('Marine Inspection', ['Vessel inspection', 'Marine equipment inspection', 'Marine cargo inspection']),
      sub('Aviation Inspection', [
        'Aircraft inspection',
        'Aviation equipment inspection',
        'Aviation maintenance inspection',
      ]),
      sub('Energy & Renewable Inspection', [
        'Solar plant inspection',
        'Wind turbine inspection',
        'Energy infrastructure inspection',
      ]),
      sub('Compliance Inspection', [
        'Regulatory compliance inspection',
        'Statutory inspection',
        'Operational compliance inspection',
      ]),
    ],
  },
  {
    slug: 'certification',
    name: 'Certification',
    categoryType: 'CERTIFICATION',
    description:
      'Independent conformity assessment against standards, regulatory requirements, schemes, specifications or management system requirements.',
    children: [
      sub('ISO Management System Certification', [
        'ISO 9001 Certification',
        'ISO 14001 Certification',
        'ISO 45001 Certification',
        'ISO 27001 Certification',
        'ISO 22000 Certification',
        'ISO 50001 Certification',
        'ISO 13485 Certification',
        'ISO 22301 Certification',
        'ISO 37001 Certification',
        'ISO 27701 Certification',
      ]),
      sub('Quality Certification', [
        'Quality management system certification',
        'Industry-specific quality certification',
      ]),
      sub('Environmental Certification', [
        'Environmental management certification',
        'Environmental compliance schemes certification',
      ]),
      sub('Occupational Health & Safety Certification', [
        'Occupational health and safety management certification',
      ]),
      sub('Information Security Certification', [
        'Information security management system certification',
        'Cybersecurity-related certification schemes',
      ]),
      sub('Food Safety Certification', [
        'FSSC 22000 Certification',
        'HACCP-based certification',
        'Food safety management system certification',
      ]),
      sub('Product Certification', [
        'Product conformity certification',
        'Product safety certification',
        'Product performance certification',
      ]),
      sub('CE Certification & Conformity Services', [
        'CE conformity assessment',
        'Technical documentation support',
        'Conformity assessment services',
      ]),
      sub('BIS Certification', [
        'BIS ISI mark certification',
        'CRS registration support',
        'BIS conformity-related services',
      ]),
      sub('Halal Certification', [
        'Halal product certification',
        'Halal food certification',
        'Halal manufacturing certification',
      ]),
      sub('Organic Certification', [
        'Organic product certification',
        'Agricultural organic certification',
        'Organic food certification',
      ]),
      sub('Sustainability Certification', [
        'Sustainability scheme certification',
        'Sustainable sourcing certification',
      ]),
      sub('ESG Certification', [
        'ESG-related certification schemes',
        'Sustainability standards certification',
      ]),
      sub('Carbon Certification', [
        'Carbon neutrality certification',
        'Carbon footprint verification certification',
        'Carbon-related certifications',
      ]),
      sub('GHG Verification', [
        'ISO 14064 verification',
        'GHG inventory verification',
        'Carbon footprint verification',
      ]),
      sub('Energy Certification', [
        'Energy management certification',
        'Energy performance-related schemes certification',
      ]),
      sub('Automotive Certification', [
        'IATF 16949 Certification',
        'Automotive quality certifications',
        'Automotive scheme-specific certifications',
      ]),
      sub('Medical & Healthcare Certification', [
        'Medical device QMS certification',
        'Healthcare-related certification schemes',
      ]),
      sub('Aerospace Certification', [
        'AS9100 Certification',
        'Aerospace management system certification',
      ]),
      sub('Supply Chain Certification', [
        'Supplier compliance certification',
        'Responsible sourcing schemes certification',
      ]),
      sub('Social Compliance Certification', [
        'SA8000 Certification',
        'Social accountability certification',
        'Workplace-related certification schemes',
      ]),
      sub('Personnel Certification', [
        'Auditor certification',
        'Competency certification',
        'Professional certification',
      ]),
      sub('Business Continuity Certification', [
        'ISO 22301 business continuity certification',
        'Continuity management certification',
      ]),
      sub('Anti-Bribery Certification', ['ISO 37001 anti-bribery certification']),
      sub('Privacy Certification', [
        'Privacy management certification',
        'Privacy certification schemes',
      ]),
    ],
  },
  {
    slug: 'professional-services',
    name: 'Professional Services',
    categoryType: 'CONSULTING',
    description:
      'Consulting, advisory, training, technical assistance, implementation, auditing, verification and specialized expertise provided by professionals or firms.',
    children: [
      sub('Management Consultancy', [
        'Business consulting',
        'Operational improvement consulting',
        'Strategic planning consulting',
        'Process optimization consulting',
      ]),
      sub('ISO Consultancy', [
        'ISO implementation',
        'ISO gap analysis',
        'ISO documentation',
        'ISO system implementation',
        'ISO readiness assessment',
      ]),
      sub('ESG Consultancy', [
        'ESG strategy consulting',
        'ESG assessment',
        'ESG roadmap',
        'ESG reporting',
        'ESG prioritization',
      ]),
      sub('Sustainability Consultancy', [
        'Sustainability strategy consulting',
        'Sustainability reporting',
        'Sustainability assessment',
        'Sustainability roadmap',
      ]),
      sub('GHG & Carbon Consultancy', [
        'GHG inventory consulting',
        'Carbon footprint calculation',
        'Scope 1, 2 & 3 calculations',
        'Carbon reduction strategy',
      ]),
      sub('BRSR Consultancy', [
        'BRSR reporting',
        'BRSR Core consulting',
        'BRSR data collection',
        'BRSR reporting preparation',
      ]),
      sub('Environmental Consultancy', [
        'Environmental management consulting',
        'Environmental impact assessment',
        'Environmental compliance advisory',
        'Pollution control advisory',
      ]),
      sub('Energy Consultancy', [
        'Energy audits',
        'Energy efficiency consulting',
        'Energy management consulting',
        'Energy conservation planning',
      ]),
      sub('Water Consultancy', [
        'Water audits',
        'Water conservation consulting',
        'Water footprint consulting',
        'Water management strategy',
      ]),
      sub('Waste Management Consultancy', [
        'Waste audits',
        'Waste minimization consulting',
        'Waste management planning',
        'Circular economy advisory',
      ]),
      sub('Health & Safety Consultancy', [
        'Safety audits',
        'Risk assessments',
        'HIRA consulting',
        'EHS systems consulting',
        'Workplace safety consultancy',
      ]),
      sub('Food Safety Consultancy', [
        'HACCP implementation',
        'Food safety documentation',
        'Food safety system implementation',
      ]),
      sub('Cybersecurity Consultancy', [
        'Cybersecurity advisory',
        'Information security risk assessment',
        'Security architecture consulting',
      ]),
      sub('Data Privacy Consultancy', [
        'Privacy compliance consulting',
        'Data protection assessment',
        'Privacy management system implementation',
      ]),
      sub('Risk Management Consultancy', [
        'Enterprise risk management consulting',
        'Operational risk consulting',
        'Business risk assessments',
      ]),
      sub('Supply Chain Consultancy', [
        'Supplier assessment consulting',
        'Supply chain sustainability consulting',
        'Supplier development consulting',
        'Supply chain risk consulting',
      ]),
      sub('Human Resource Consultancy', [
        'HR advisory',
        'HR audits',
        'Organizational development consulting',
        'Employee engagement consulting',
      ]),
      sub('Legal & Regulatory Consultancy', [
        'Regulatory advisory',
        'Compliance support consulting',
        'Legal compliance assessments',
      ]),
      sub('Financial Consultancy', [
        'Financial advisory',
        'Cost analysis consulting',
        'Budgeting consulting',
        'Financial planning consulting',
      ]),
      sub('Technical Consultancy', [
        'Engineering consultancy',
        'Technical advisory',
        'Design review consulting',
        'Technical documentation consulting',
      ]),
      sub('Project Management Consultancy', [
        'Project planning consulting',
        'Project management consulting',
        'Project monitoring consulting',
        'Implementation management consulting',
      ]),
      sub('Training Services', [
        'ISO training',
        'Auditor training',
        'Technical training',
        'Corporate training',
        'EHS training',
      ]),
      sub('Lead Auditor Training', [
        'ISO Lead Auditor courses',
        'Internal Auditor courses',
        'Auditor development programmes',
      ]),
      sub('Internal Audit Services', [
        'Internal audits',
        'Management system audits',
        'Process audits',
        'Compliance audits',
      ]),
      sub('Supplier Audit Services', [
        'Supplier audits',
        'Vendor audits',
        'Supplier quality audits',
        'Supplier ESG audits',
      ]),
      sub('Second-Party Audit Services', ['Customer audits', 'Second-party supplier audits', 'Contract audits']),
      sub('Verification Services', [
        'GHG verification services',
        'Sustainability data verification',
        'Environmental data verification',
      ]),
      sub('Validation Services', [
        'Project validation',
        'Environmental project validation',
        'Carbon project validation',
      ]),
      sub('Documentation Services', [
        'SOP preparation',
        'Policy documentation',
        'Manual preparation',
        'Technical documentation services',
        'Compliance documentation',
      ]),
      sub('Regulatory Compliance Services', [
        'Regulatory compliance assessment',
        'Statutory compliance support',
        'Compliance gap analysis',
      ]),
      sub('Accreditation Consultancy', [
        'NABL preparation',
        'NABCB preparation',
        'Accreditation documentation',
        'Accreditation readiness',
      ]),
      sub('Calibration Services', [
        'Instrument calibration',
        'Equipment calibration',
        'Onsite calibration',
        'Laboratory calibration',
      ]),
      sub('Laboratory Consultancy', [
        'Laboratory setup consulting',
        'Laboratory management consulting',
        'ISO/IEC 17025 implementation',
      ]),
      sub('Business Continuity Consultancy', [
        'Business continuity planning',
        'Disaster recovery planning',
        'BCP implementation',
      ]),
      sub('Industrial Training', [
        'Industrial technical training',
        'Manufacturing training',
        'Process training',
        'Machinery training',
      ]),
      sub('Specialized Professional Services', [
        'Freelance auditor services',
        'Independent consultant services',
        'Engineering specialist services',
        'Sustainability expert services',
        'Technical specialist services',
      ]),
    ],
  },
];

/** Prefix service slugs with subcategory slug so names like "Soil testing" stay unique globally. */
export function uniqueServiceSlug(categorySlug: string, serviceSlug: string) {
  const prefixed = `${categorySlug}-${serviceSlug}`.slice(0, 120).replace(/-+$/g, '');
  return prefixed || serviceSlug;
}

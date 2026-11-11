import { EventRecord } from '../types/studio';

export interface ParsedActivityDraft {
  name: string;
  title: string;
  subtitle: string;
  venue: string;
  address: string;
  date: string;
  custom_fields: Record<string, string>;
}

/**
 * Full 18-Day Orange Campaign 2026 Dataset (Pre-Campaign + Days 1 to 18)
 */
export const GAD_CAMPAIGN_2026_SAMPLE_TEXT = `================================================================================
18-DAY ORANGE CAMPAIGN: CALENDAR OF ACTIVITIES
18-DAY CAMPAIGN TO END VIOLENCE AGAINST WOMEN AND THEIR CHILDREN
City Government of Cauayan, Isabela • November 25 – December 12, 2026
"Project S.U.N.S.H.I.N.E. for Safe, Inclusive and Technology-Responsive Communities"
================================================================================

================================================================================
18-DAY ACTIVITY MATRIX (INCLUDING PRE-CAMPAIGN VALIDATION)
================================================================================
--------------------------------------------------------------------------------
PRE-CAMPAIGN INDEPENDENT VALIDATION
--------------------------------------------------------------------------------
Dates: November 16 - 20, 2026
Title: Barangay Validation of Outstanding GAD Champions (OGAD Champions)
Subtitle: Best Barangay GAD Implementors
Lead Office: GAD Office
Partners: DILG, LGU Offices, Liga ng mga Barangay, CCGLO
Venue: Per Regions

--------------------------------------------------------------------------------
DAY 1 | NOV 25, 2026 | WED
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: GAD Office
  Description: Wellness and Essential Care Distribution for Project S.U.N.S.H.I.N.E Beneficiaries.
Activity 2:
  Lead Office: GAD Office & Office of the City Mayor
  Description: Opening Program, Orange Campaign Kickoff, Parade around the City, Policy Call to Action, Project S.U.N.S.H.I.N.E. public launch.
Partners: All City Offices, Barangays, PNP, BFP, BJMP, CSWD, Academe, CSOs
Venue: CITYWIDE

--------------------------------------------------------------------------------
DAY 2 | NOV 26, 2026 | THU
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: PESO / COOP / CEDIPO
  Description: Women's economic empowerment, safe employment, anti-trafficking and cyber recruitment scam awareness.
Activity 2:
  Lead Office: City Agriculture & Cooperative Office
  Description: Rural women protection, livelihood, cooperative support, and community-based prevention.
Activity 3 (NOV 26–30, 2026):
  Lead Office: City Accounting Office
  Description: GAD Employee Development, Recognition and Organizational Strengthening Program.
Partners: DA, DOLE, DTI, OWWA, COA, Cooperatives, MSMES, Barangays, CSOs, Private Sector
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 3 | NOV 27, 2026 | FRI
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: PDAO & OSCA
  Description: Protection of women with disabilities & senior women; inclusive referral and access to support, and Sign Language Orientation.
Activity 2:
  Lead Office: GAD Office
  Description: Namnama (PWD Film Viewing)
Activity 3:
  Lead Office: CSWDO
  Description: Survivor-centered care management, psychosocial first aid, women and children referral mapping.
Partners (Activities 1, 2, 3): CSWDO, Health Office, PNP, PNP-WCPD, NGAs, CSOs, ISAC, Women with Disabilities Group
Venue (Activities 1, 2, 3): F. L. Dy Colliseum, District III, Cauayan City, Isabela
Activity 4:
  Lead Office: City Population Office
  Description: KABATAAN PRO-TECT (Teen Empowerment and Care Team): Peer Helping Training on Safe Spaces, Mental Health, and ASRH
Partners (Activity 4): City Health Office, Local Youth Development Office, Cauayan City Stand Alone Senior High School
Venue (Activity 4): Cauayan City Stand Alone Senior High School

--------------------------------------------------------------------------------
DAY 4 | NOV 28, 2026 | SAT
--------------------------------------------------------------------------------
Lead Office: Cooperative Office CSOs / POs / OGP Partners / Faith-based Groups
Main Activity: Multi-stakeholder dialogues, citizen participation, social accountability, survivor advocacy, and community partnership building.
Partners: All Community and Development Partners
Venue: Isabela Convention Center, San Fermin, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 5 | NOV 29, 2026 | SUN
--------------------------------------------------------------------------------
Advocacy Track: ONLINE ADVOCACY
Description: Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters

--------------------------------------------------------------------------------
DAY 6 | NOV 30, 2026 | MON
--------------------------------------------------------------------------------
Lead Office: City Youth Development Office, SK Federation of Cauayan City / Kalinga Kabataan Program
Main Activity: Youth forum on online safety, consent, anti-bullying, anti-grooming, TFGBV and cyber trafficking prevention.
Partners: DepEd, SK, VM Office, Sangguniang Panlungsod, Youth Groups, Faith Groups, PNP, Legal Office
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 7 | DEC 1, 2026 | TUE
--------------------------------------------------------------------------------
Lead Office: CHRMO & CODI
Main Activity: Safe workplace, anti-sexual harassment, internal reporting and protection mechanisms.
Partners: DILG, HR Office, GAD Office, CSOs
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 8 | DEC 2, 2026 | WED
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: CHRMO & CODI
  Description: Safe workplace, anti-sexual harassment, internal reporting and protection mechanisms.
Activity 2:
  Lead Office: City Health Office (CHO)
  Description: World Aids Day Celebrations 2026 : “Ending Aids Starts with Access”
Partners: DILG, HR Office, GAD Office, CSOs
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 9 | DEC 3, 2026 | THU
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: GAD Office & MOVE
  Description: Men as allies forum, healthy masculinity, shared responsibility, and prevention of VAWC & online abuse.
Activity 2:
  Lead Office: CDRRMO / Rescue 922 / Safe Line
  Description: Emergency response simulation, hotline awareness, safety drill, and rapid coordination.
Partners: PNP, BFP, BJMP, CDRRMO, MDRRMO, All Teams, JCI, Faith Groups, Youth Groups, Academe, DepEd, MASON, ROTARY Club of Cauayan
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 10 | DEC 4, 2026 | FRI
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: City Health Office
  Description: Health response, mental health, reproductive health, medico-legal awareness, and support services for survivors.
Activity 2:
  Lead Office: City Legal Office
  Description: Orientation on RA 9262, Safe Spaces Act, Anti-Trafficking, cyber-related VAWC and online crimes; legal referral pathways.
Activity 3:
  Lead Office: PNP-WCPD / LCAT-VAWC / BJMP / Justice Sector
  Description: Case documentation, law enforcement coordination, protection procedures, and anti-online exploitation response.
Activity 4:
  Lead Office: Liga ng mga Barangay / VAW Desks
  Description: Barangay action planning, desk strengthening, community watch, and referral readiness.
Activity 5:
  Lead Office: JCD GAD CONNECT and CDRRMO
  Description: Digital Safety Day: demo of Project S.U.N.S.H.I.N.E., iReport VAWC, Safe Line, online reporting, cyber safety & digital evidence awareness.
Partners: DILG, PNP, BJMP, City Prosecutor's Office, PAO, Barangays, Barangay Officials, BSWDO, Hospitals, RHUs, NGOs, Mental Health Partners, GAD Office, Tech Partners, JCI
Venue: Isabela Convention Center, San Fermin, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 11 | DEC 5, 2026 | SAT
--------------------------------------------------------------------------------
In-Person Activity:
  Lead Office: GAD Office
  Main Activity: Campaign Learning and Service Readiness Day
  Venue: Bamboo Hall, City Hall, Cauayan City, Isabela
Online Activity:
  Advocacy Track: ONLINE ADVOCACY
  Description: Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters

--------------------------------------------------------------------------------
DAY 12 | DEC 6, 2026 | SUN
--------------------------------------------------------------------------------
Advocacy Track: ONLINE ADVOCACY
Description: Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters

--------------------------------------------------------------------------------
DAY 13 | DEC 7, 2026 | MON
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: GAD Office
  Description: Seminar on Gender Functionality Assessment Tool (GFAST) and Gender Responsiveness LGU (GERL) Assessment Tool.
Activity 2:
  Lead Office: CPDO / GAD KMS Team
  Description: Data-driven governance, sex-disaggregated data, monitoring dashboards, GERL and accountability tools.
Activity 3:
  Lead Office: GAD Office
  Description: Display of Orange Exhibits
Partners: DILG, PCW, Province of Isabela GFPS, Cauayan City GFPS, IT Office, Planning Office, All Offices
Venue: Isabela Convention Center, San Fermin, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 14 | DEC 8, 2026 | TUE
--------------------------------------------------------------------------------
Lead Office: PIO, GAD Office, DepEd, ISU-Cauayan, Tourism Office, ISAC, CSOs
Main Activity: Orange Exhibit and Orange Bubble Culture Arts and Public Advocacy: Painting Competition, Spoken Poetry, Declamation and Wearable Fashion Designing
Special Badge / Event: Awarding of Winners
Partners: Local Artists, Media, Content Creators
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 15 | DEC 9, 2026 | WED
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: Culminating Activity led by LGU Cauayan
  Description: Awarding of all barangays & offices, recognition of partners, presentation of commitments, and ceremonial signing of Memorandum of Partnership with NAPC and OPAPRU.
Activity 2:
  Lead Office: GAD Office
  Description: PROJECT ORANGE RISE: Empowering 12 Women in Economic Enterprise through the Proceeds of Orange Run
Partners: DILG, NAPC, OPAPRU, PCW, CEDIPO, CSWDO, City Budget Office, City Accounting Office, GSO, DTI, TESDA, Cooperatives, Barangay Local Government Units, All Offices, All Partners, CSOs
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 16 | DEC 10, 2026 | THU
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: GAD Office
  Description: GAD in Action: Enhancing Gender-Responsive Management and Leadership
Activity 2:
  Lead Office: GAD Office
  Description: Regional Educational Research Conference
Partners: DEPED RO2, SDO Cauayan City, CSOs
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 17 | DEC 11, 2026 | FRI
--------------------------------------------------------------------------------
In-Person Activity:
  Lead Office: GAD Office
  Main Activity: Regional Educational Research Conference
  Partners: SDO Cauayan City, DEPED RO2
  Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela
Online Activity:
  Advocacy Track: ONLINE ADVOCACY
  Description: Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters

--------------------------------------------------------------------------------
DAY 18 | DEC 12, 2026 | SAT
--------------------------------------------------------------------------------
In-Person Activity:
  Lead Office: GAD Office
  ACTIVITY 1: Display of Orange Exhibits
  ACTIVITY 2: Posting of Accomplishment Reports for the 18-day Campaign
Online Activity:
  Advocacy Track: ONLINE ADVOCACY
  Description: Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters`;

/**
 * Combined Per-Day / Per-Event Tarpaulin Edition (from 18-Day_Campaign_Calendar_Combined_Events.txt + SANA LAST NA.docx titles)
 */
export const GAD_CAMPAIGN_2026_COMBINED_TEXT = `================================================================================
18-DAY ORANGE CAMPAIGN: CALENDAR OF ACTIVITIES (COMBINED PER-DAY / PER-EVENT TARPAULIN EDITION)
18-DAY CAMPAIGN TO END VIOLENCE AGAINST WOMEN AND THEIR CHILDREN
City Government of Cauayan, Isabela • November 25 – December 12, 2026
"Project S.U.N.S.H.I.N.E. for Safe, Inclusive and Technology-Responsive Communities"
================================================================================

================================================================================
18-DAY COMBINED TARPAULIN ACTIVITY MATRIX (WITH UPDATED TITLES FROM "SANA LAST NA.docx")
================================================================================
--------------------------------------------------------------------------------
PRE-CAMPAIGN INDEPENDENT VALIDATION
--------------------------------------------------------------------------------
Dates: November 16 - 20, 2026
Title: Barangay Validation of Outstanding GAD Champions (OGAD Champions)
Subtitle: Best Barangay GAD Implementors
Lead Office: GAD Office
Partners: DILG, LGU Offices, Liga ng mga Barangay, CCGLO
Venue: Per Regions

--------------------------------------------------------------------------------
DAY 1 | NOV 25, 2026 | WED
--------------------------------------------------------------------------------
Lead Office: GAD Office & Office of the City Mayor
Main Activity: Wellness and Essential Care Distribution for Project S.U.N.S.H.I.N.E Beneficiaries & Opening Program, Orange Campaign Kickoff, Parade around the City, Policy Call to Action, Project S.U.N.S.H.I.N.E. Public Launch
Partners: All City Offices, Barangays, PNP, BFP, BJMP, CSWD, Academe, CSOs
Venue: CITYWIDE

--------------------------------------------------------------------------------
DAY 2 | NOV 26, 2026 | THU
--------------------------------------------------------------------------------
Lead Office: PESO / COOP / CEDIPO, City Agriculture & Cooperative Office, City Accounting Office
Main Activity: Economic Empowerment for Women Safe Employment and Anti Trafficking Forum • Rural Women Protection, Livelihood and Cooperative Support Forum • GAD Employee Development, Recognition and Organizational Strengthening Program
Partners: DA, DOLE, DTI, OWWA, COA, Cooperatives, MSMES, Barangays, CSOs, Private Sector
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 3 | NOV 27, 2026 | FRI
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: PDAO, OSCA, GAD Office & CSWDO
  Description: Inclusive Protection, Accessible Services, and Sign Language Orientation for Women with Disabilities and Senior Women • Namnama (PWD Film Viewing) • Project SUNSHINE Survivor – Centered Case Management and Referral Review
Partners (Activity 1): CSWDO, Health Office, PNP, PNP-WCPD, NGAs, CSOs, ISAC, Women with Disabilities Group
Venue (Activity 1): F. L. Dy Colliseum, District III, Cauayan City, Isabela
Activity 2:
  Lead Office: City Population Office
  Description: KABATAAN PRO-TECT (Teen Empowerment and Care Team): Peer Helping Training on Safe Spaces, Mental Health, and ASRH
Partners (Activity 2): City Health Office, Local Youth Development Office, Cauayan City Stand Alone Senior High School
Venue (Activity 2): Cauayan City Stand Alone Senior High School

--------------------------------------------------------------------------------
DAY 4 | NOV 28, 2026 | SAT
--------------------------------------------------------------------------------
Lead Office: Cooperative Office CSOs / POs / OGP Partners / Faith-based Groups
Main Activity: Multi-Stakeholder Dialogue on Accountability to Survivors and Community Partnership
Partners: All Community and Development Partners
Venue: Isabela Convention Center, San Fermin, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 5 | NOV 29, 2026 | SUN
--------------------------------------------------------------------------------
Advocacy Track: ONLINE ADVOCACY
Description: Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters

--------------------------------------------------------------------------------
DAY 6 | NOV 30, 2026 | MON
--------------------------------------------------------------------------------
Lead Office: City Youth Development Office, SK Federation of Cauayan City / Kalinga Kabataan Program
Main Activity: Youth forum on online safety, consent, anti-bullying, anti-grooming, TFGBV and cyber trafficking prevention.
Partners: DepEd, SK, VM Office, Sangguniang Panlungsod, Youth Groups, Faith Groups, PNP, Legal Office
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 7 | DEC 1, 2026 | TUE
--------------------------------------------------------------------------------
Lead Office: CHRMO & CODI
Main Activity: Gender Sensitivity Training for LGU Employees and LDC Members
Partners: DILG, HR Office, GAD Office, CSOs
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 8 | DEC 2, 2026 | WED
--------------------------------------------------------------------------------
Lead Office: CHRMO & CODI, City Health Office (CHO)
Main Activity: Safe Workplace Compliance and Anti-Sexual Harassment Orientation & World Aids Day Celebrations 2026 : “Ending Aids Starts with Access”
Partners: DILG, HR Office, GAD Office, CSOs
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 9 | DEC 3, 2026 | THU
--------------------------------------------------------------------------------
Lead Office: GAD Office & MOVE, CDRRMO / Rescue 922 / Safe Line
Main Activity: Men as Allies and Men Opposed to Violence Everywhere (MOVE) Forum on Healthy Masculinity and Shared Responsibility & Safeline 922 Emergency Response Simulation and Referral Drill
Partners: PNP, BFP, BJMP, CDRRMO, MDRRMO, All Teams, JCI, Faith Groups, Youth Groups, Academe, DepEd, MASON, ROTARY Club of Cauayan
Venue: Isabela Convention Center, San Fermin, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 10 | DEC 4, 2026 | FRI
--------------------------------------------------------------------------------
Lead Office: City Health Office, City Legal Office, PNP-WCPD / LCAT-VAWC / BJMP / Justice Sector, Liga ng mga Barangay / VAW Desks, JCD GAD CONNECT and CDRRMO
Main Activity: End VAWC Action Forum: Enhancing Survivor Healthcare, Legal Frameworks, LCAT-VAW Desk Coordination, and Digital Safety Innovations
Partners: DILG, PNP, BJMP, City Prosecutor's Office, PAO, Barangays, Barangay Officials, BSWDO, Hospitals, RHUs, NGOs, Mental Health Partners, GAD Office, Tech Partners, JCI
Venue: Isabela Convention Center, San Fermin, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 11 | DEC 5, 2026 | SAT
--------------------------------------------------------------------------------
Lead Office: GAD Office (with Online Advocacy Track)
Main Activity: Campaign Learning and Service Readiness Day & Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters
Venue: Bamboo Hall, City Hall, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 12 | DEC 6, 2026 | SUN
--------------------------------------------------------------------------------
Advocacy Track: ONLINE ADVOCACY
Description: Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters

--------------------------------------------------------------------------------
DAY 13 | DEC 7, 2026 | MON
--------------------------------------------------------------------------------
Lead Office: GAD Office & CPDO / GAD KMS Team
Main Activity: Deepening Session on GFAsT and the GeRL Tool: Province of Isabela – LGUs Edition • Data-Driven Governance, Sex-Disaggregated Data, Monitoring Dashboards, GERL and Accountability Tools • Display of Orange Exhibits
Partners: DILG, PCW, Province of Isabela GFPS, Cauayan City GFPS, IT Office, Planning Office, All Offices
Venue: Isabela Convention Center, San Fermin, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 14 | DEC 8, 2026 | TUE
--------------------------------------------------------------------------------
Lead Office: PIO, GAD Office, DepEd, ISU-Cauayan, Tourism Office, ISAC, CSOs
Main Activity: Orange Exhibit and Orange Bubble Culture Arts and Public Advocacy: Painting Competition, Spoken Poetry, Declamation and Wearable Fashion Designing
Special Badge / Event: Awarding of Winners
Partners: Local Artists, Media, Content Creators
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 15 | DEC 9, 2026 | WED
--------------------------------------------------------------------------------
Lead Office: LGU Cauayan & GAD Office
Main Activity: Culminating and Awarding Ceremony: 2026 18-Day Campaign to End VAW & PROJECT ORANGE RISE: Empowering 12 Women in Economic Enterprise through the Proceeds of Orange Run
Partners: DILG, NAPC, OPAPRU, PCW, CEDIPO, CSWDO, City Budget Office, City Accounting Office, GSO, DTI, TESDA, Cooperatives, Barangay Local Government Units, All Offices, All Partners, CSOs
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 16 | DEC 10, 2026 | THU
--------------------------------------------------------------------------------
Lead Office: GAD Office
Main Activity: GAD in Action: Enhancing Gender-Responsive Management and Leadership & Regional Educational Research Conference
Partners: DEPED RO2, SDO Cauayan City, CSOs
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 17 | DEC 11, 2026 | FRI
--------------------------------------------------------------------------------
Lead Office: GAD Office (with Online Advocacy Track)
Main Activity: Regional Educational Research Conference & Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters
Partners: SDO Cauayan City, DEPED RO2
Venue: F. L. Dy Colliseum, District III, Cauayan City, Isabela

--------------------------------------------------------------------------------
DAY 18 | DEC 12, 2026 | SAT
--------------------------------------------------------------------------------
Lead Office: GAD Office (with Online Advocacy Track)
Main Activity: Display of Orange Exhibits & Posting of Accomplishment Reports for the 18-Day Campaign (with Online Advocacy Videos & Safe Spaces Pledges)
Partners: All City Offices, Barangays, CSOs
Venue: City Hall / Online Social Media Platforms`;

/**
 * Parses the full 18-Day Orange Campaign Calendar (or any similar structured schedule)
 * into individual tarpaulin EventRecord drafts.
 */
export function parseStructuredScheduleText(rawText: string): ParsedActivityDraft[] {
  const results: ParsedActivityDraft[] = [];
  if (!rawText || !rawText.trim()) return results;

  // Strip top "====" banner blocks before the first "----" section
  const cleanedText = rawText.replace(/^={10,}[\s\S]*?={10,}\s*/gm, '').trim();

  // Split by dashed separator lines: "----------------..."
  const rawChunks = cleanedText
    .split(/^-{10,}\s*$/m)
    .map((c) => c.trim())
    .filter(Boolean);

  const sections: { header: string; body: string }[] = [];
  let i = 0;
  while (i < rawChunks.length) {
    const current = rawChunks[i];
    const currentLines = current
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (currentLines.length === 1 && i + 1 < rawChunks.length) {
      sections.push({
        header: currentLines[0],
        body: rawChunks[i + 1],
      });
      i += 2;
    } else {
      sections.push({
        header: currentLines[0] || `Section ${sections.length + 1}`,
        body: currentLines.slice(1).join('\n'),
      });
      i += 1;
    }
  }

  for (const sec of sections) {
    const header = sec.header.trim();
    const lines = sec.body.split(/\r?\n/);

    let sectionDate = '';
    if (header.includes('|')) {
      const parts = header.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        sectionDate = parts.slice(1).join(' | ');
      }
    }

    let directTitle = '';
    let directSubtitle = '';
    let directLeadOffice = '';
    let directAdvocacyTrack = '';
    let directSpecialBadge = '';
    let sharedPartners = '';
    let sharedVenue = '';
    const scopedPartners: Record<string, string> = {};
    const scopedVenues: Record<string, string> = {};

    interface ActivityItem {
      num: string;
      label: string;
      dateOverride: string;
      leadOffice: string;
      advocacyTrack: string;
      description: string;
      venueOverride: string;
      partnersOverride: string;
      specialBadge: string;
    }

    const activities: ActivityItem[] = [];
    let currentActivity: ActivityItem | null = null;
    let currentModeLeadOffice = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Match "In-Person Activity:" or "Online Activity:"
      const modeBlockMatch = line.match(/^(In-Person Activity|Online Activity)\s*:\s*$/i);
      if (modeBlockMatch) {
        if (currentActivity && currentActivity.description) {
          activities.push(currentActivity);
        }
        const blockLabel = modeBlockMatch[1];
        currentActivity = {
          num: String(activities.length + 1),
          label: blockLabel,
          dateOverride: '',
          leadOffice: '',
          advocacyTrack: '',
          description: '',
          venueOverride: '',
          partnersOverride: '',
          specialBadge: '',
        };
        continue;
      }

      // Match "Activity N (optional date): optional inline description" (case-insensitive, supports "ACTIVITY 1: Display...")
      const actMatch = line.match(/^Activity\s+(\d+)(?:\s*\(([^)]+)\))?\s*:\s*(.*)$/i);
      if (actMatch) {
        // Save previous activity if it had a description or if we are switching to a new numbered activity
        if (currentActivity) {
          if (currentActivity.leadOffice && !currentModeLeadOffice) {
            currentModeLeadOffice = currentActivity.leadOffice;
          }
          if (currentActivity.description) {
            activities.push(currentActivity);
          }
        }
        const inlineDesc = actMatch[3] ? actMatch[3].trim() : '';
        currentActivity = {
          num: actMatch[1],
          label: `Activity ${actMatch[1]}`,
          dateOverride: actMatch[2] ? actMatch[2].trim() : '',
          leadOffice: currentModeLeadOffice || '',
          advocacyTrack: '',
          description: inlineDesc,
          venueOverride: '',
          partnersOverride: '',
          specialBadge: '',
        };
        continue;
      }

      // Match scoped Partners like "Partners (Activities 1, 2, 3): ..."
      const scopedPartnerMatch = line.match(/^Partners\s*\(([^)]+)\)\s*:\s*(.+)$/i);
      if (scopedPartnerMatch) {
        const nums = scopedPartnerMatch[1].match(/\d+/g) || [];
        for (const n of nums) {
          scopedPartners[n] = scopedPartnerMatch[2].trim();
        }
        continue;
      }

      // Match scoped Venue like "Venue (Activities 1, 2, 3): ..."
      const scopedVenueMatch = line.match(/^Venue\s*\(([^)]+)\)\s*:\s*(.+)$/i);
      if (scopedVenueMatch) {
        const nums = scopedVenueMatch[1].match(/\d+/g) || [];
        for (const n of nums) {
          scopedVenues[n] = scopedVenueMatch[2].trim();
        }
        continue;
      }

      // Generic Key: Value line
      const kvMatch = line.match(/^([A-Za-z0-9 _/-]+)\s*:\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim().toLowerCase();
        const val = kvMatch[2].trim();

        if (key === 'dates' || key === 'date') {
          sectionDate = val;
        } else if (key === 'title' || key === 'main activity' || key === 'description') {
          if (currentActivity) {
            currentActivity.description = val;
          } else {
            directTitle = val;
          }
        } else if (key === 'subtitle') {
          directSubtitle = val;
        } else if (key === 'lead office') {
          if (currentActivity) {
            currentActivity.leadOffice = val;
            currentModeLeadOffice = val;
          } else {
            directLeadOffice = val;
          }
        } else if (key === 'advocacy track') {
          if (currentActivity) {
            currentActivity.advocacyTrack = val;
          } else {
            directAdvocacyTrack = val;
          }
        } else if (key === 'special badge / event' || key === 'special badge') {
          if (currentActivity) {
            currentActivity.specialBadge = val;
          } else {
            directSpecialBadge = val;
          }
        } else if (key === 'partners') {
          if (currentActivity && (currentActivity.label === 'In-Person Activity' || currentActivity.label === 'Online Activity')) {
            currentActivity.partnersOverride = val;
          } else {
            sharedPartners = val;
          }
        } else if (key === 'venue') {
          if (currentActivity && (currentActivity.label === 'In-Person Activity' || currentActivity.label === 'Online Activity')) {
            currentActivity.venueOverride = val;
          } else {
            sharedVenue = val;
          }
        }
      }
    }

    if (currentActivity && currentActivity.description) {
      activities.push(currentActivity);
    }

    const shortDay = header.split('|')[0].trim();

    if (activities.length > 0) {
      for (const act of activities) {
        const isOnline =
          act.label.toLowerCase().includes('online') ||
          act.advocacyTrack.toLowerCase().includes('online');
        const actVenue =
          act.venueOverride ||
          scopedVenues[act.num] ||
          (isOnline ? 'Online / Social Media Platforms' : sharedVenue);
        const actPartners = act.partnersOverride || scopedPartners[act.num] || sharedPartners;
        const actDate = act.dateOverride || sectionDate;
        const leadOrTrack = act.leadOffice || act.advocacyTrack || directLeadOffice;

        const badgeVal = act.specialBadge || directSpecialBadge;
        const customFields: Record<string, string> = {
          day_header: header,
          activity_no: act.label,
          lead_office: leadOrTrack,
          partners: actPartners,
        };
        if (badgeVal) {
          customFields.special_badge = badgeVal;
        }

        results.push({
          name: `${shortDay} - ${act.label}`,
          title: act.description || `${header} - ${act.label}`,
          subtitle: leadOrTrack
            ? `${act.advocacyTrack && !act.leadOffice ? 'Advocacy Track' : 'Lead Office'}: ${leadOrTrack}`
            : directSubtitle,
          venue: actVenue,
          address: '',
          date: actDate,
          custom_fields: customFields,
        });
      }
    } else if (directTitle || header) {
      const leadOrTrack = directLeadOffice || directAdvocacyTrack;
      const isOnline = directAdvocacyTrack.toLowerCase().includes('online');
      const customFields: Record<string, string> = {
        day_header: header,
        activity_no: 'Main Activity',
        lead_office: leadOrTrack,
        partners: sharedPartners,
      };
      if (directSpecialBadge) {
        customFields.special_badge = directSpecialBadge;
      }

      results.push({
        name: shortDay,
        title: directTitle || header,
        subtitle:
          directSubtitle ||
          (leadOrTrack
            ? `${directAdvocacyTrack && !directLeadOffice ? 'Advocacy Track' : 'Lead Office'}: ${leadOrTrack}`
            : ''),
        venue: sharedVenue || (isOnline ? 'Online / Social Media Platforms' : ''),
        address: '',
        date: sectionDate,
        custom_fields: customFields,
      });
    }
  }

  return results;
}

export function draftsToEventRecords(
  drafts: ParsedActivityDraft[],
  startIndex = 0
): EventRecord[] {
  return drafts.map((d, i) => ({
    id: `evt_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 5)}`,
    name: d.name,
    title: d.title,
    subtitle: d.subtitle,
    venue: d.venue,
    address: d.address,
    date: d.date,
    custom_fields: d.custom_fields,
    logos: [],
    element_visibility: {},
    element_overrides: {},
    order_index: startIndex + i,
  }));
}

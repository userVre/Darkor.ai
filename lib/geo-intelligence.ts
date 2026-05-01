import AsyncStorage from "@react-native-async-storage/async-storage";
import {getCalendars, getLocales, useCalendars, useLocales, type Calendar, type Locale} from "expo-localization";
import {useSyncExternalStore} from "react";

import {
DEFAULT_LANGUAGE,
resolveSupportedLanguage,
type AppLanguage,
} from "./i18n/language";

export const GEO_INTELLIGENCE_STORAGE_KEY = "homedecor.ai.geo-intelligence.v1";

export type GeoIntelligenceSnapshot = {
  regionCode: string;
  languageCode: string;
  languageTag: string;
  resolvedLanguage: AppLanguage;
  detectedAt: number;
  source: "device" | "stored";
};

type StoredGeoIntelligenceSnapshot = Omit<GeoIntelligenceSnapshot, "source">;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function normalizeRegionCode(input?: string | null) {
  return String(input ?? "").trim().toUpperCase();
}

const COUNTRY_LANGUAGE_PREFERENCES: Record<string, readonly AppLanguage[]> = {
  AF: ["en-US"],
  AD: ["es", "fr"],
  AE: ["ar"],
  AG: ["en-US"],
  AI: ["en-US"],
  AL: ["en-US"],
  AM: ["ru", "en-US"],
  AO: ["pt"],
  AR: ["es"],
  AS: ["en-US"],
  AT: ["de"],
  AU: ["en-US"],
  AW: ["en-US"],
  AX: ["sv"],
  AZ: ["ru", "en-US"],
  BA: ["en-US"],
  BB: ["en-US"],
  BD: ["en-US"],
  BE: ["fr", "de"],
  BF: ["fr"],
  BG: ["en-US"],
  BH: ["ar"],
  BI: ["fr"],
  BJ: ["fr"],
  BL: ["fr"],
  BM: ["en-US"],
  BN: ["en-US"],
  BO: ["es"],
  BQ: ["en-US"],
  BR: ["pt-BR"],
  BS: ["en-US"],
  BT: ["en-US"],
  BW: ["en-US"],
  BY: ["ru"],
  BZ: ["en-US", "es"],
  CA: ["en-US", "fr"],
  CD: ["fr"],
  CF: ["fr"],
  CG: ["fr"],
  CH: ["de", "fr", "it"],
  CI: ["fr"],
  CK: ["en-US"],
  CL: ["es"],
  CM: ["fr", "en-US"],
  CN: ["zh-Hans"],
  CO: ["es"],
  CR: ["es"],
  CU: ["es"],
  CV: ["pt"],
  CW: ["en-US"],
  CY: ["en-US"],
  CZ: ["en-US"],
  DE: ["de"],
  DJ: ["fr", "ar"],
  DK: ["en-US"],
  DM: ["en-US"],
  DO: ["es"],
  DZ: ["fr"],
  EC: ["es"],
  EG: ["ar"],
  EE: ["en-US"],
  ER: ["ar", "en-US"],
  ES: ["es"],
  ET: ["en-US"],
  FI: ["sv", "en-US"],
  FJ: ["en-US"],
  FK: ["en-US"],
  FM: ["en-US"],
  FO: ["en-US"],
  FR: ["fr"],
  GA: ["fr"],
  GB: ["en-US"],
  GD: ["en-US"],
  GE: ["ru", "en-US"],
  GF: ["fr"],
  GG: ["en-US"],
  GH: ["en-US"],
  GI: ["en-US", "es"],
  GL: ["en-US"],
  GM: ["en-US"],
  GN: ["fr"],
  GP: ["fr"],
  GQ: ["es", "fr"],
  GR: ["en-US"],
  GT: ["es"],
  GU: ["en-US"],
  GW: ["pt"],
  GY: ["en-US"],
  HK: ["zh-Hant", "en-US"],
  HN: ["es"],
  HR: ["en-US"],
  HT: ["fr"],
  HU: ["en-US"],
  ID: ["en-US"],
  IE: ["en-US"],
  IL: ["ar", "en-US"],
  IM: ["en-US"],
  IN: ["en-US"],
  IO: ["en-US"],
  IQ: ["ar"],
  IR: ["en-US"],
  IS: ["en-US"],
  IT: ["it"],
  JE: ["en-US"],
  JM: ["en-US"],
  JO: ["ar"],
  JP: ["ja"],
  KE: ["en-US"],
  KG: ["ru"],
  KH: ["fr", "en-US"],
  KM: ["fr", "ar"],
  KN: ["en-US"],
  KR: ["ko"],
  KW: ["ar"],
  KZ: ["ru"],
  LA: ["fr", "en-US"],
  LB: ["ar", "fr"],
  LC: ["en-US"],
  LI: ["de"],
  LK: ["en-US"],
  LR: ["en-US"],
  LS: ["en-US"],
  LT: ["en-US"],
  LU: ["fr", "de"],
  LV: ["ru", "en-US"],
  LY: ["ar"],
  MA: ["fr"],
  MC: ["fr"],
  MD: ["ru", "en-US"],
  ME: ["en-US"],
  MF: ["fr"],
  MG: ["fr"],
  MH: ["en-US"],
  MK: ["en-US"],
  ML: ["fr"],
  MM: ["en-US"],
  MN: ["ru", "en-US"],
  MO: ["zh-Hant", "pt"],
  MP: ["en-US"],
  MQ: ["fr"],
  MR: ["ar", "fr"],
  MS: ["en-US"],
  MT: ["en-US"],
  MU: ["en-US", "fr"],
  MV: ["en-US"],
  MW: ["en-US"],
  MX: ["es-MX"],
  MY: ["en-US", "zh-Hans"],
  MZ: ["pt"],
  NA: ["en-US"],
  NC: ["fr"],
  NE: ["fr"],
  NF: ["en-US"],
  NG: ["en-US"],
  NI: ["es"],
  NL: ["en-US"],
  NO: ["en-US"],
  NP: ["en-US"],
  NR: ["en-US"],
  NZ: ["en-US"],
  OM: ["ar"],
  PA: ["es"],
  PE: ["es"],
  PF: ["fr"],
  PG: ["en-US"],
  PH: ["en-US"],
  PK: ["en-US"],
  PL: ["en-US"],
  PM: ["fr"],
  PN: ["en-US"],
  PR: ["es", "en-US"],
  PS: ["ar"],
  PT: ["pt"],
  PW: ["en-US"],
  PY: ["es"],
  QA: ["ar"],
  RE: ["fr"],
  RO: ["en-US"],
  RS: ["en-US"],
  RU: ["ru"],
  RW: ["fr", "en-US"],
  SA: ["ar"],
  SB: ["en-US"],
  SC: ["fr", "en-US"],
  SD: ["ar"],
  SE: ["sv"],
  SG: ["en-US", "zh-Hans"],
  SH: ["en-US"],
  SI: ["en-US"],
  SK: ["en-US"],
  SL: ["en-US"],
  SM: ["it"],
  SN: ["fr"],
  SO: ["ar", "en-US"],
  SR: ["en-US"],
  SS: ["en-US", "ar"],
  ST: ["pt"],
  SV: ["es"],
  SX: ["en-US"],
  SY: ["ar"],
  SZ: ["en-US"],
  TD: ["fr", "ar"],
  TG: ["fr"],
  TH: ["en-US"],
  TJ: ["ru"],
  TK: ["en-US"],
  TL: ["pt"],
  TM: ["ru"],
  TN: ["fr"],
  TO: ["en-US"],
  TR: ["en-US"],
  TT: ["en-US"],
  TV: ["en-US"],
  TW: ["zh-Hant"],
  TZ: ["en-US"],
  UA: ["ru", "en-US"],
  UG: ["en-US"],
  US: ["en-US"],
  UY: ["es"],
  UZ: ["ru"],
  VA: ["it"],
  VC: ["en-US"],
  VE: ["es"],
  VG: ["en-US"],
  VI: ["en-US"],
  VN: ["vi"],
  VU: ["en-US", "fr"],
  WF: ["fr"],
  WS: ["en-US"],
  XK: ["en-US"],
  YE: ["ar"],
  YT: ["fr"],
  ZA: ["en-US"],
  ZM: ["en-US"],
  ZW: ["en-US"],
};

const TIME_ZONE_COUNTRY_OVERRIDES: Record<string, string> = {
  "africa/abidjan": "CI",
  "africa/accra": "GH",
  "africa/addis_ababa": "ET",
  "africa/algiers": "DZ",
  "africa/asmara": "ER",
  "africa/asmera": "ER",
  "africa/bamako": "ML",
  "africa/bangui": "CF",
  "africa/banjul": "GM",
  "africa/bissau": "GW",
  "africa/blantyre": "MW",
  "africa/brazzaville": "CG",
  "africa/bujumbura": "BI",
  "africa/casablanca": "MA",
  "africa/ceuta": "ES",
  "africa/conakry": "GN",
  "africa/dakar": "SN",
  "africa/dar_es_salaam": "TZ",
  "africa/djibouti": "DJ",
  "africa/douala": "CM",
  "africa/el_aaiun": "EH",
  "africa/freetown": "SL",
  "africa/gaborone": "BW",
  "africa/harare": "ZW",
  "africa/johannesburg": "ZA",
  "africa/juba": "SS",
  "africa/kampala": "UG",
  "africa/khartoum": "SD",
  "africa/kigali": "RW",
  "africa/kinshasa": "CD",
  "africa/lagos": "NG",
  "africa/libreville": "GA",
  "africa/lome": "TG",
  "africa/luanda": "AO",
  "africa/lubumbashi": "CD",
  "africa/lusaka": "ZM",
  "africa/malabo": "GQ",
  "africa/maputo": "MZ",
  "africa/maseru": "LS",
  "africa/mbabane": "SZ",
  "africa/mogadishu": "SO",
  "africa/monrovia": "LR",
  "africa/nairobi": "KE",
  "africa/ndjamena": "TD",
  "africa/niamey": "NE",
  "africa/nouakchott": "MR",
  "africa/ouagadougou": "BF",
  "africa/porto-novo": "BJ",
  "africa/sao_tome": "ST",
  "africa/tripoli": "LY",
  "africa/tunis": "TN",
  "africa/windhoek": "NA",
  "america/adak": "US",
  "america/anchorage": "US",
  "america/anguilla": "AI",
  "america/antigua": "AG",
  "america/araguaina": "BR",
  "america/argentina/buenos_aires": "AR",
  "america/argentina/catamarca": "AR",
  "america/argentina/comodrivadavia": "AR",
  "america/argentina/cordoba": "AR",
  "america/argentina/jujuy": "AR",
  "america/argentina/la_rioja": "AR",
  "america/argentina/mendoza": "AR",
  "america/argentina/rio_gallegos": "AR",
  "america/argentina/salta": "AR",
  "america/argentina/san_juan": "AR",
  "america/argentina/san_luis": "AR",
  "america/argentina/tucuman": "AR",
  "america/argentina/ushuaia": "AR",
  "america/aruba": "AW",
  "america/asuncion": "PY",
  "america/atikokan": "CA",
  "america/atka": "US",
  "america/bahia": "BR",
  "america/bahia_banderas": "MX",
  "america/barbados": "BB",
  "america/belem": "BR",
  "america/belize": "BZ",
  "america/blanc-sablon": "CA",
  "america/boa_vista": "BR",
  "america/bogota": "CO",
  "america/boise": "US",
  "america/buenos_aires": "AR",
  "america/cambridge_bay": "CA",
  "america/campo_grande": "BR",
  "america/cancun": "MX",
  "america/caracas": "VE",
  "america/catamarca": "AR",
  "america/cayenne": "GF",
  "america/cayman": "KY",
  "america/chicago": "US",
  "america/chihuahua": "MX",
  "america/ciudad_juarez": "MX",
  "america/coral_harbour": "CA",
  "america/cordoba": "AR",
  "america/costa_rica": "CR",
  "america/creston": "CA",
  "america/cuiaba": "BR",
  "america/curacao": "CW",
  "america/danmarkshavn": "GL",
  "america/dawson": "CA",
  "america/dawson_creek": "CA",
  "america/denver": "US",
  "america/detroit": "US",
  "america/dominica": "DM",
  "america/edmonton": "CA",
  "america/eirunepe": "BR",
  "america/el_salvador": "SV",
  "america/ensenada": "MX",
  "america/fort_nelson": "CA",
  "america/fort_wayne": "US",
  "america/fortaleza": "BR",
  "america/glace_bay": "CA",
  "america/godthab": "GL",
  "america/goose_bay": "CA",
  "america/grand_turk": "TC",
  "america/grenada": "GD",
  "america/guadeloupe": "GP",
  "america/guatemala": "GT",
  "america/guayaquil": "EC",
  "america/guyana": "GY",
  "america/halifax": "CA",
  "america/havana": "CU",
  "america/hermosillo": "MX",
  "america/indiana/indianapolis": "US",
  "america/indiana/knox": "US",
  "america/indiana/marengo": "US",
  "america/indiana/petersburg": "US",
  "america/indiana/tell_city": "US",
  "america/indiana/vevay": "US",
  "america/indiana/vincennes": "US",
  "america/indiana/winamac": "US",
  "america/indianapolis": "US",
  "america/inuvik": "CA",
  "america/iqaluit": "CA",
  "america/jamaica": "JM",
  "america/jujuy": "AR",
  "america/juneau": "US",
  "america/kentucky/louisville": "US",
  "america/kentucky/monticello": "US",
  "america/knox_in": "US",
  "america/kralendijk": "BQ",
  "america/la_paz": "BO",
  "america/lima": "PE",
  "america/los_angeles": "US",
  "america/louisville": "US",
  "america/lower_princes": "SX",
  "america/maceio": "BR",
  "america/managua": "NI",
  "america/manaus": "BR",
  "america/marigot": "MF",
  "america/martinique": "MQ",
  "america/matamoros": "MX",
  "america/mazatlan": "MX",
  "america/mendoza": "AR",
  "america/menominee": "US",
  "america/merida": "MX",
  "america/metlakatla": "US",
  "america/mexico_city": "MX",
  "america/miquelon": "PM",
  "america/moncton": "CA",
  "america/monterrey": "MX",
  "america/montevideo": "UY",
  "america/montreal": "CA",
  "america/montserrat": "MS",
  "america/nassau": "BS",
  "america/new_york": "US",
  "america/nipigon": "CA",
  "america/nome": "US",
  "america/noronha": "BR",
  "america/north_dakota/beulah": "US",
  "america/north_dakota/center": "US",
  "america/north_dakota/new_salem": "US",
  "america/nuuk": "GL",
  "america/ojinaga": "MX",
  "america/panama": "PA",
  "america/pangnirtung": "CA",
  "america/paramaribo": "SR",
  "america/phoenix": "US",
  "america/port-au-prince": "HT",
  "america/port_of_spain": "TT",
  "america/porto_acre": "BR",
  "america/porto_velho": "BR",
  "america/puerto_rico": "PR",
  "america/punta_arenas": "CL",
  "america/rainy_river": "CA",
  "america/rankin_inlet": "CA",
  "america/recife": "BR",
  "america/regina": "CA",
  "america/resolute": "CA",
  "america/rio_branco": "BR",
  "america/rosario": "AR",
  "america/santa_isabel": "MX",
  "america/santarem": "BR",
  "america/santiago": "CL",
  "america/santo_domingo": "DO",
  "america/sao_paulo": "BR",
  "america/scoresbysund": "GL",
  "america/shiprock": "US",
  "america/sitka": "US",
  "america/st_barthelemy": "BL",
  "america/st_johns": "CA",
  "america/st_kitts": "KN",
  "america/st_lucia": "LC",
  "america/st_thomas": "VI",
  "america/st_vincent": "VC",
  "america/swift_current": "CA",
  "america/tegucigalpa": "HN",
  "america/thule": "GL",
  "america/thunder_bay": "CA",
  "america/tijuana": "MX",
  "america/toronto": "CA",
  "america/tortola": "VG",
  "america/vancouver": "CA",
  "america/virgin": "VI",
  "america/whitehorse": "CA",
  "america/winnipeg": "CA",
  "america/yakutat": "US",
  "america/yellowknife": "CA",
  "antarctica/casey": "AQ",
  "antarctica/davis": "AQ",
  "antarctica/dumontdurville": "AQ",
  "antarctica/macquarie": "AU",
  "antarctica/mawson": "AQ",
  "antarctica/mcmurdo": "AQ",
  "antarctica/palmer": "AQ",
  "antarctica/rothera": "AQ",
  "antarctica/south_pole": "AQ",
  "antarctica/syowa": "AQ",
  "antarctica/troll": "AQ",
  "antarctica/vostok": "AQ",
  "arctic/longyearbyen": "SJ",
  "asia/aden": "YE",
  "asia/almaty": "KZ",
  "asia/amman": "JO",
  "asia/anadyr": "RU",
  "asia/aqtau": "KZ",
  "asia/aqtobe": "KZ",
  "asia/ashgabat": "TM",
  "asia/ashkhabad": "TM",
  "asia/atyrau": "KZ",
  "asia/baghdad": "IQ",
  "asia/bahrain": "BH",
  "asia/baku": "AZ",
  "asia/bangkok": "TH",
  "asia/barnaul": "RU",
  "asia/beirut": "LB",
  "asia/bishkek": "KG",
  "asia/brunei": "BN",
  "asia/calcutta": "IN",
  "asia/chita": "RU",
  "asia/choibalsan": "MN",
  "asia/chongqing": "CN",
  "asia/chungking": "CN",
  "asia/colombo": "LK",
  "asia/dacca": "BD",
  "asia/damascus": "SY",
  "asia/dhaka": "BD",
  "asia/dili": "TL",
  "asia/dubai": "AE",
  "asia/dushanbe": "TJ",
  "asia/famagusta": "CY",
  "asia/gaza": "PS",
  "asia/harbin": "CN",
  "asia/hebron": "PS",
  "asia/ho_chi_minh": "VN",
  "asia/hong_kong": "HK",
  "asia/hovd": "MN",
  "asia/irkutsk": "RU",
  "asia/istanbul": "TR",
  "asia/jakarta": "ID",
  "asia/jayapura": "ID",
  "asia/jerusalem": "IL",
  "asia/kabul": "AF",
  "asia/kamchatka": "RU",
  "asia/karachi": "PK",
  "asia/kashgar": "CN",
  "asia/kathmandu": "NP",
  "asia/katmandu": "NP",
  "asia/khandyga": "RU",
  "asia/kolkata": "IN",
  "asia/krasnoyarsk": "RU",
  "asia/kuala_lumpur": "MY",
  "asia/kuching": "MY",
  "asia/kuwait": "KW",
  "asia/macao": "MO",
  "asia/macau": "MO",
  "asia/magadan": "RU",
  "asia/makassar": "ID",
  "asia/manila": "PH",
  "asia/muscat": "OM",
  "asia/nicosia": "CY",
  "asia/novokuznetsk": "RU",
  "asia/novosibirsk": "RU",
  "asia/omsk": "RU",
  "asia/oral": "KZ",
  "asia/phnom_penh": "KH",
  "asia/pontianak": "ID",
  "asia/pyongyang": "KP",
  "asia/qatar": "QA",
  "asia/qostanay": "KZ",
  "asia/qyzylorda": "KZ",
  "asia/rangoon": "MM",
  "asia/riyadh": "SA",
  "asia/saigon": "VN",
  "asia/sakhalin": "RU",
  "asia/samarkand": "UZ",
  "asia/seoul": "KR",
  "asia/shanghai": "CN",
  "asia/singapore": "SG",
  "asia/srednekolymsk": "RU",
  "asia/taipei": "TW",
  "asia/tashkent": "UZ",
  "asia/tbilisi": "GE",
  "asia/tehran": "IR",
  "asia/tel_aviv": "IL",
  "asia/thimbu": "BT",
  "asia/thimphu": "BT",
  "asia/tokyo": "JP",
  "asia/tomsk": "RU",
  "asia/ujung_pandang": "ID",
  "asia/ulaanbaatar": "MN",
  "asia/ulan_bator": "MN",
  "asia/urumqi": "CN",
  "asia/ust-nera": "RU",
  "asia/vientiane": "LA",
  "asia/vladivostok": "RU",
  "asia/yakutsk": "RU",
  "asia/yangon": "MM",
  "asia/yekaterinburg": "RU",
  "asia/yerevan": "AM",
  "atlantic/azores": "PT",
  "atlantic/bermuda": "BM",
  "atlantic/canary": "ES",
  "atlantic/cape_verde": "CV",
  "atlantic/faeroe": "FO",
  "atlantic/faroe": "FO",
  "atlantic/jan_mayen": "SJ",
  "atlantic/madeira": "PT",
  "atlantic/reykjavik": "IS",
  "atlantic/south_georgia": "GS",
  "atlantic/st_helena": "SH",
  "atlantic/stanley": "FK",
  "australia/act": "AU",
  "australia/adelaide": "AU",
  "australia/brisbane": "AU",
  "australia/broken_hill": "AU",
  "australia/canberra": "AU",
  "australia/currie": "AU",
  "australia/darwin": "AU",
  "australia/eucla": "AU",
  "australia/hobart": "AU",
  "australia/lhi": "AU",
  "australia/lindeman": "AU",
  "australia/lord_howe": "AU",
  "australia/melbourne": "AU",
  "australia/nsw": "AU",
  "australia/north": "AU",
  "australia/perth": "AU",
  "australia/queensland": "AU",
  "australia/south": "AU",
  "australia/sydney": "AU",
  "australia/tasmania": "AU",
  "australia/victoria": "AU",
  "australia/west": "AU",
  "australia/yancowinna": "AU",
  "brazil/acre": "BR",
  "brazil/denoronha": "BR",
  "brazil/east": "BR",
  "brazil/west": "BR",
  "canada/atlantic": "CA",
  "canada/central": "CA",
  "canada/eastern": "CA",
  "canada/mountain": "CA",
  "canada/newfoundland": "CA",
  "canada/pacific": "CA",
  "canada/saskatchewan": "CA",
  "canada/yukon": "CA",
  "chile/continental": "CL",
  "chile/easterisland": "CL",
  "europe/amsterdam": "NL",
  "europe/andorra": "AD",
  "europe/astrakhan": "RU",
  "europe/athens": "GR",
  "europe/belfast": "GB",
  "europe/belgrade": "RS",
  "europe/berlin": "DE",
  "europe/bratislava": "SK",
  "europe/brussels": "BE",
  "europe/bucharest": "RO",
  "europe/budapest": "HU",
  "europe/busingen": "DE",
  "europe/chisinau": "MD",
  "europe/copenhagen": "DK",
  "europe/dublin": "IE",
  "europe/gibraltar": "GI",
  "europe/guernsey": "GG",
  "europe/helsinki": "FI",
  "europe/isle_of_man": "IM",
  "europe/istanbul": "TR",
  "europe/jersey": "JE",
  "europe/kaliningrad": "RU",
  "europe/kirov": "RU",
  "europe/kiev": "UA",
  "europe/kyiv": "UA",
  "europe/lisbon": "PT",
  "europe/ljubljana": "SI",
  "europe/london": "GB",
  "europe/luxembourg": "LU",
  "europe/madrid": "ES",
  "europe/malta": "MT",
  "europe/mariehamn": "AX",
  "europe/minsk": "BY",
  "europe/monaco": "MC",
  "europe/moscow": "RU",
  "europe/nicosia": "CY",
  "europe/oslo": "NO",
  "europe/paris": "FR",
  "europe/podgorica": "ME",
  "europe/prague": "CZ",
  "europe/riga": "LV",
  "europe/rome": "IT",
  "europe/samara": "RU",
  "europe/san_marino": "SM",
  "europe/sarajevo": "BA",
  "europe/saratov": "RU",
  "europe/simferopol": "UA",
  "europe/skopje": "MK",
  "europe/sofia": "BG",
  "europe/stockholm": "SE",
  "europe/tallinn": "EE",
  "europe/tirane": "AL",
  "europe/tiraspol": "MD",
  "europe/ulyanovsk": "RU",
  "europe/uzhgorod": "UA",
  "europe/vaduz": "LI",
  "europe/vatican": "VA",
  "europe/vienna": "AT",
  "europe/vilnius": "LT",
  "europe/volgograd": "RU",
  "europe/warsaw": "PL",
  "europe/zagreb": "HR",
  "europe/zaporozhye": "UA",
  "europe/zurich": "CH",
  "indian/antananarivo": "MG",
  "indian/chagos": "IO",
  "indian/christmas": "CX",
  "indian/cocos": "CC",
  "indian/comoro": "KM",
  "indian/kerguelen": "TF",
  "indian/mahe": "SC",
  "indian/maldives": "MV",
  "indian/mauritius": "MU",
  "indian/mayotte": "YT",
  "indian/reunion": "RE",
  "mexico/bajanorte": "MX",
  "mexico/bajasur": "MX",
  "mexico/general": "MX",
  "pacific/apia": "WS",
  "pacific/auckland": "NZ",
  "pacific/bougainville": "PG",
  "pacific/chatham": "NZ",
  "pacific/chuuk": "FM",
  "pacific/easter": "CL",
  "pacific/efate": "VU",
  "pacific/enderbury": "KI",
  "pacific/fakaofo": "TK",
  "pacific/fiji": "FJ",
  "pacific/funafuti": "TV",
  "pacific/galapagos": "EC",
  "pacific/gambier": "PF",
  "pacific/guadalcanal": "SB",
  "pacific/guam": "GU",
  "pacific/honolulu": "US",
  "pacific/johnston": "UM",
  "pacific/kanton": "KI",
  "pacific/kiritimati": "KI",
  "pacific/kosrae": "FM",
  "pacific/kwajalein": "MH",
  "pacific/majuro": "MH",
  "pacific/marquesas": "PF",
  "pacific/midway": "UM",
  "pacific/nauru": "NR",
  "pacific/niue": "NU",
  "pacific/norfolk": "NF",
  "pacific/noumea": "NC",
  "pacific/pago_pago": "AS",
  "pacific/palau": "PW",
  "pacific/pitcairn": "PN",
  "pacific/pohnpei": "FM",
  "pacific/ponape": "FM",
  "pacific/port_moresby": "PG",
  "pacific/rarotonga": "CK",
  "pacific/saipan": "MP",
  "pacific/samoa": "AS",
  "pacific/tahiti": "PF",
  "pacific/tarawa": "KI",
  "pacific/tongatapu": "TO",
  "pacific/truk": "FM",
  "pacific/wake": "UM",
  "pacific/wallis": "WF",
  "pacific/yap": "FM",
  "us/alaska": "US",
  "us/aleutian": "US",
  "us/arizona": "US",
  "us/central": "US",
  "us/east-indiana": "US",
  "us/eastern": "US",
  "us/hawaii": "US",
  "us/indiana-starke": "US",
  "us/michigan": "US",
  "us/mountain": "US",
  "us/pacific": "US",
  "us/samoa": "AS",
};

function pickPrimaryLocale(locales?: readonly Locale[]) {
  return locales?.[0] ?? getLocales()[0];
}

function pickPrimaryCalendar(calendars?: readonly Calendar[]) {
  return calendars?.[0] ?? getCalendars()[0];
}

function resolveRegionCode(locale?: Locale | null, calendar?: Calendar | null) {
  const timeZoneRegion = TIME_ZONE_COUNTRY_OVERRIDES[String(calendar?.timeZone ?? "").trim().toLowerCase()];
  if (timeZoneRegion) {
    return timeZoneRegion;
  }

  const directRegion = normalizeRegionCode(locale?.regionCode);
  if (directRegion.length === 2) {
    return directRegion;
  }

  const languageRegion = normalizeRegionCode(locale?.languageRegionCode);
  if (languageRegion.length === 2) {
    return languageRegion;
  }

  const fromTag = String(locale?.languageTag ?? "")
    .split("-")
    .find((part) => /^[A-Za-z]{2}$/.test(part));
  const normalizedFromTag = normalizeRegionCode(fromTag);
  if (normalizedFromTag.length === 2) {
    return normalizedFromTag;
  }

  return "US";
}

function resolveGeoLanguage(locale?: Locale | null, regionCode?: string | null) {
  const normalizedRegionCode = normalizeRegionCode(regionCode);
  const countryPreferences = COUNTRY_LANGUAGE_PREFERENCES[normalizedRegionCode];

  if (countryPreferences?.[0]) {
    return countryPreferences[0];
  }

  const candidate = resolveSupportedLanguage(
    locale?.languageTag
      ?? locale?.languageCode
      ?? null,
  );

  return candidate || DEFAULT_LANGUAGE;
}

export function detectGeoIntelligence(
  locales?: readonly Locale[],
  calendars?: readonly Calendar[],
): GeoIntelligenceSnapshot {
  const locale = pickPrimaryLocale(locales);
  const calendar = pickPrimaryCalendar(calendars);
  const regionCode = resolveRegionCode(locale, calendar);
  const languageTag = String(locale?.languageTag ?? locale?.languageCode ?? DEFAULT_LANGUAGE);
  const languageCode = String(locale?.languageCode ?? languageTag.split("-")[0] ?? "en").trim().toLowerCase() || "en";

  return {
    regionCode,
    languageCode,
    languageTag,
    resolvedLanguage: resolveGeoLanguage(locale, regionCode),
    detectedAt: Date.now(),
    source: "device",
  };
}

let currentSnapshot: GeoIntelligenceSnapshot = detectGeoIntelligence();

function sanitizeStoredSnapshot(
  snapshot?: Partial<StoredGeoIntelligenceSnapshot> | null,
): GeoIntelligenceSnapshot | null {
  if (!snapshot) {
    return null;
  }

  const regionCode = normalizeRegionCode(snapshot.regionCode);
  const languageTag = String(snapshot.languageTag ?? "").trim();
  if (regionCode.length !== 2 || !languageTag) {
    return null;
  }

  return {
    regionCode,
    languageCode: String(snapshot.languageCode ?? languageTag.split("-")[0] ?? "en").trim().toLowerCase() || "en",
    languageTag,
    resolvedLanguage: resolveSupportedLanguage(snapshot.resolvedLanguage ?? languageTag),
    detectedAt: typeof snapshot.detectedAt === "number" && Number.isFinite(snapshot.detectedAt) ? snapshot.detectedAt : Date.now(),
    source: "stored",
  };
}

function snapshotsEqual(left: GeoIntelligenceSnapshot, right: GeoIntelligenceSnapshot) {
  return (
    left.regionCode === right.regionCode
    && left.languageCode === right.languageCode
    && left.languageTag === right.languageTag
    && left.resolvedLanguage === right.resolvedLanguage
    && left.detectedAt === right.detectedAt
    && left.source === right.source
  );
}

async function persistSnapshot(snapshot: GeoIntelligenceSnapshot) {
  const storedSnapshot: StoredGeoIntelligenceSnapshot = {
    regionCode: snapshot.regionCode,
    languageCode: snapshot.languageCode,
    languageTag: snapshot.languageTag,
    resolvedLanguage: snapshot.resolvedLanguage,
    detectedAt: snapshot.detectedAt,
  };

  await AsyncStorage.setItem(GEO_INTELLIGENCE_STORAGE_KEY, JSON.stringify(storedSnapshot));
}

async function readStoredSnapshot() {
  try {
    const raw = await AsyncStorage.getItem(GEO_INTELLIGENCE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return sanitizeStoredSnapshot(JSON.parse(raw) as StoredGeoIntelligenceSnapshot);
  } catch {
    return null;
  }
}

function setCurrentSnapshot(snapshot: GeoIntelligenceSnapshot) {
  if (snapshotsEqual(currentSnapshot, snapshot)) {
    return;
  }

  currentSnapshot = snapshot;
  emitChange();
}

export async function initializeGeoIntelligence() {
  const detectedSnapshot = detectGeoIntelligence();
  const storedSnapshot = await readStoredSnapshot();

  if (
    storedSnapshot
    && storedSnapshot.regionCode === detectedSnapshot.regionCode
    && storedSnapshot.languageTag === detectedSnapshot.languageTag
    && storedSnapshot.resolvedLanguage === detectedSnapshot.resolvedLanguage
  ) {
    setCurrentSnapshot(storedSnapshot);
    return storedSnapshot;
  }

  await persistSnapshot(detectedSnapshot);
  setCurrentSnapshot(detectedSnapshot);
  return detectedSnapshot;
}

export async function syncGeoIntelligenceWithDevice(
  locales?: readonly Locale[],
  calendars?: readonly Calendar[],
) {
  const nextSnapshot = detectGeoIntelligence(locales, calendars);
  await persistSnapshot(nextSnapshot);
  setCurrentSnapshot(nextSnapshot);
  return nextSnapshot;
}

export function getGeoIntelligenceSnapshot() {
  return currentSnapshot;
}

export function useGeoIntelligence() {
  const locales = useLocales();
  const calendars = useCalendars();

  return useSyncExternalStore(
    subscribe,
    () => getGeoIntelligenceSnapshot(),
    () => detectGeoIntelligence(locales, calendars),
  );
}

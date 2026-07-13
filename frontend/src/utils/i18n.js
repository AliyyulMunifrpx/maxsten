import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import file JSON yang sudah kita buat
import translationID from "./id/translation.json";
import translationEN from "./en/translation.json";

const resources = {
  id: {
    translation: translationID,
  },
  en: {
    translation: translationEN,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "id",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, 
  },
});

export default i18n;

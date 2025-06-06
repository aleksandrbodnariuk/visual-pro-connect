
import { Language } from "@/context/LanguageContext";

export const translations: Record<Language, Record<string, string>> = {
  uk: {
    // Auth page
    loginToApp: "Увійти на платформу",
    register: "Зареєструватися",
    appDescription: "Visual Pro Connect - соціальна мережа для творчих професіоналів",
    phoneNumber: "Номер телефону",
    password: "Пароль",
    confirmPassword: "Підтвердження паролю",
    firstName: "Ім'я",
    lastName: "Прізвище",
    firstNamePlaceholder: "Олександр",
    lastNamePlaceholder: "Петренко",
    login: "Увійти",
    noAccount: "Не маєте акаунту? Зареєструватися",
    alreadyHaveAccount: "Вже маєте акаунт? Увійти",
    loginSuccessful: "Вхід успішний",
    loginAsAdminFounder: "Вхід як Адміністратор-засновник",
    incorrectPhoneOrPassword: "Неправильний номер телефону або пароль",
    passwordsDoNotMatch: "Паролі не співпадають",
    enterNameAndSurname: "Введіть ім'я та прізвище",
    userWithPhoneExists: "Користувач з таким номером телефону вже зареєстрований",
    registrationSuccessful: "Реєстрація успішна",
    enterPhoneAndPassword: "Введіть номер телефону та пароль",
    
    // Password reset
    forgotPassword: "Забули пароль?",
    resetPassword: "Скидання паролю",
    reset: "Скинути",
    confirm: "Підтвердити",
    enterPhone: "Введіть номер телефону",
    phoneNotRegistered: "Номер телефону не зареєстрований",
    backToLogin: "Повернутися до входу",
    verificationCodeSent: "Код підтвердження надіслано:",
    verifyCode: "Підтвердження коду",
    enterVerificationCode: "Введіть код підтвердження",
    newPassword: "Новий пароль",
    confirmNewPassword: "Підтвердження нового паролю",
    incorrectCode: "Неправильний код",
    passwordResetSuccess: "Пароль успішно скинуто",
    useTemporaryPassword: "Використайте тимчасовий пароль: 00000000",
    temporaryPasswordLogin: "Вхід з тимчасовим паролем",
    pleaseChangePassword: "Будь ласка, змініть пароль в налаштуваннях",

    // Language selector
    language: "Мова",
    ukrainian: "Українська",
    english: "Англійська",
    polish: "Польська",
    german: "Німецька",
    romanian: "Румунська",
    
    // General
    home: "Головна",
    search: "Пошук",
    notifications: "Сповіщення",
    messages: "Повідомлення",
    profile: "Профіль",
    settings: "Налаштування",
    stockMarket: "Ринок акцій",
    
    // Menu
    menu: "Меню",
    categories: "Категорії",
    photographers: "Фотографи",
    videographers: "Відеографи",
    musicians: "Музиканти",
    hosts: "Ведучі",
    pyrotechnicians: "Піротехніки",
    
    // Misc
    findContacts: "Знайти контакти",
    expandNetwork: "Розширте свою мережу",
    findClientsPartners: "Знаходьте нових клієнтів та партнерів для співпраці"
  },
  
  en: {
    // Auth page
    loginToApp: "Login to Platform",
    register: "Register",
    appDescription: "Visual Pro Connect - social network for creative professionals",
    phoneNumber: "Phone Number",
    password: "Password",
    confirmPassword: "Confirm Password",
    firstName: "First Name",
    lastName: "Last Name",
    firstNamePlaceholder: "John",
    lastNamePlaceholder: "Smith",
    login: "Login",
    noAccount: "Don't have an account? Register",
    alreadyHaveAccount: "Already have an account? Login",
    loginSuccessful: "Login successful",
    loginAsAdminFounder: "Login as Admin-Founder",
    incorrectPhoneOrPassword: "Incorrect phone number or password",
    passwordsDoNotMatch: "Passwords do not match",
    enterNameAndSurname: "Enter first name and last name",
    userWithPhoneExists: "User with this phone number already exists",
    registrationSuccessful: "Registration successful",
    enterPhoneAndPassword: "Enter phone number and password",
    
    // Password reset
    forgotPassword: "Forgot password?",
    resetPassword: "Reset Password",
    reset: "Reset",
    confirm: "Confirm",
    enterPhone: "Enter phone number",
    phoneNotRegistered: "Phone number not registered",
    backToLogin: "Back to login",
    verificationCodeSent: "Verification code sent:",
    verifyCode: "Verify Code",
    enterVerificationCode: "Enter verification code",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    incorrectCode: "Incorrect code",
    passwordResetSuccess: "Password reset successful",
    useTemporaryPassword: "Use temporary password: 00000000",
    temporaryPasswordLogin: "Login with temporary password",
    pleaseChangePassword: "Please change your password in settings",

    // Language selector
    language: "Language",
    ukrainian: "Ukrainian",
    english: "English",
    polish: "Polish",
    german: "German",
    romanian: "Romanian",
    
    // General
    home: "Home",
    search: "Search",
    notifications: "Notifications",
    messages: "Messages",
    profile: "Profile",
    settings: "Settings",
    
    // Menu
    menu: "Menu",
    categories: "Categories",
    photographers: "Photographers",
    videographers: "Videographers",
    musicians: "Musicians",
    hosts: "Hosts",
    pyrotechnicians: "Pyrotechnicians",
    
    // Misc
    findContacts: "Find Contacts",
    expandNetwork: "Expand Your Network",
    findClientsPartners: "Find new clients and partners for collaboration"
  },
  
  pl: {
    // Auth page
    loginToApp: "Zaloguj się do platformy",
    register: "Zarejestruj się",
    appDescription: "Visual Pro Connect - sieć społecznościowa dla profesjonalistów kreatywnych",
    phoneNumber: "Numer telefonu",
    password: "Hasło",
    confirmPassword: "Potwierdź hasło",
    firstName: "Imię",
    lastName: "Nazwisko",
    firstNamePlaceholder: "Jan",
    lastNamePlaceholder: "Kowalski",
    login: "Zaloguj się",
    noAccount: "Nie masz konta? Zarejestruj się",
    alreadyHaveAccount: "Masz już konto? Zaloguj się",
    loginSuccessful: "Logowanie pomyślne",
    loginAsAdminFounder: "Zaloguj jako Administrator-Założyciel",
    incorrectPhoneOrPassword: "Nieprawidłowy numer telefonu lub hasło",
    passwordsDoNotMatch: "Hasła nie pasują",
    enterNameAndSurname: "Wprowadź imię i nazwisko",
    userWithPhoneExists: "Użytkownik z tym numerem telefonu już istnieje",
    registrationSuccessful: "Rejestracja pomyślna",
    enterPhoneAndPassword: "Wprowadź numer telefonu i hasło",
    
    // Password reset
    forgotPassword: "Zapomniałeś hasła?",
    resetPassword: "Resetuj hasło",
    reset: "Resetuj",
    confirm: "Potwierdź",
    enterPhone: "Wprowadź numer telefonu",
    phoneNotRegistered: "Numer telefonu nie jest zarejestrowany",
    backToLogin: "Powrót do logowania",
    verificationCodeSent: "Kod weryfikacyjny wysłany:",
    verifyCode: "Weryfikacja kodu",
    enterVerificationCode: "Wprowadź kod weryfikacyjny",
    newPassword: "Nowe hasło",
    confirmNewPassword: "Potwierdź nowe hasło",
    incorrectCode: "Nieprawidłowy kod",
    passwordResetSuccess: "Hasło zostało pomyślnie zresetowane",
    useTemporaryPassword: "Użyj tymczasowego hasła: 00000000",
    temporaryPasswordLogin: "Logowanie z tymczasowym hasłem",
    pleaseChangePassword: "Zmień hasło w ustawieniach",

    // Language selector
    language: "Język",
    ukrainian: "Ukraiński",
    english: "Angielski",
    polish: "Polski",
    german: "Niemiecki",
    romanian: "Rumuński",
    
    // General
    home: "Strona główna",
    search: "Wyszukaj",
    notifications: "Powiadomienia",
    messages: "Wiadomości",
    profile: "Profil",
    settings: "Ustawienia",
    
    // Menu
    menu: "Menu",
    categories: "Kategorie",
    photographers: "Fotografowie",
    videographers: "Wideografowie",
    musicians: "Muzycy",
    hosts: "Prowadzący",
    pyrotechnicians: "Pirotechnicy",
    
    // Misc
    findContacts: "Znajdź kontakty",
    expandNetwork: "Rozszerz swoją sieć",
    findClientsPartners: "Znajdź nowych klientów i partnerów do współpracy"
  },
  
  de: {
    // Auth page
    loginToApp: "Bei der Plattform anmelden",
    register: "Registrieren",
    appDescription: "Visual Pro Connect - soziales Netzwerk für kreative Profis",
    phoneNumber: "Telefonnummer",
    password: "Passwort",
    confirmPassword: "Passwort bestätigen",
    firstName: "Vorname",
    lastName: "Nachname",
    firstNamePlaceholder: "Hans",
    lastNamePlaceholder: "Müller",
    login: "Anmelden",
    noAccount: "Kein Konto? Registrieren",
    alreadyHaveAccount: "Bereits ein Konto? Anmelden",
    loginSuccessful: "Anmeldung erfolgreich",
    loginAsAdminFounder: "Als Admin-Gründer anmelden",
    incorrectPhoneOrPassword: "Falsche Telefonnummer oder Passwort",
    passwordsDoNotMatch: "Passwörter stimmen nicht überein",
    enterNameAndSurname: "Geben Sie Vor- und Nachname ein",
    userWithPhoneExists: "Benutzer mit dieser Telefonnummer existiert bereits",
    registrationSuccessful: "Registrierung erfolgreich",
    enterPhoneAndPassword: "Geben Sie Telefonnummer und Passwort ein",
    
    // Password reset
    forgotPassword: "Passwort vergessen?",
    resetPassword: "Passwort zurücksetzen",
    reset: "Zurücksetzen",
    confirm: "Bestätigen",
    enterPhone: "Telefonnummer eingeben",
    phoneNotRegistered: "Telefonnummer nicht registriert",
    backToLogin: "Zurück zur Anmeldung",
    verificationCodeSent: "Bestätigungscode gesendet:",
    verifyCode: "Code überprüfen",
    enterVerificationCode: "Bestätigungscode eingeben",
    newPassword: "Neues Passwort",
    confirmNewPassword: "Neues Passwort bestätigen",
    incorrectCode: "Falscher Code",
    passwordResetSuccess: "Passwort erfolgreich zurückgesetzt",
    useTemporaryPassword: "Temporäres Passwort verwenden: 00000000",
    temporaryPasswordLogin: "Anmeldung mit temporärem Passwort",
    pleaseChangePassword: "Bitte ändern Sie Ihr Passwort in den Einstellungen",

    // Language selector
    language: "Sprache",
    ukrainian: "Ukrainisch",
    english: "Englisch",
    polish: "Polnisch",
    german: "Deutsch",
    romanian: "Rumänisch",
    
    // General
    home: "Startseite",
    search: "Suche",
    notifications: "Benachrichtigungen",
    messages: "Nachrichten",
    profile: "Profil",
    settings: "Einstellungen",
    
    // Menu
    menu: "Menü",
    categories: "Kategorien",
    photographers: "Fotografen",
    videographers: "Videografen",
    musicians: "Musiker",
    hosts: "Moderatoren",
    pyrotechnicians: "Pyrotechniker",
    
    // Misc
    findContacts: "Kontakte finden",
    expandNetwork: "Erweitern Sie Ihr Netzwerk",
    findClientsPartners: "Finden Sie neue Kunden und Partner für die Zusammenarbeit"
  },
  
  ro: {
    // Auth page
    loginToApp: "Conectare la platformă",
    register: "Înregistrare",
    appDescription: "Visual Pro Connect - rețea socială pentru profesioniști creativi",
    phoneNumber: "Număr de telefon",
    password: "Parolă",
    confirmPassword: "Confirmare parolă",
    firstName: "Prenume",
    lastName: "Nume",
    firstNamePlaceholder: "Ion",
    lastNamePlaceholder: "Popescu",
    login: "Conectare",
    noAccount: "Nu ai cont? Înregistrează-te",
    alreadyHaveAccount: "Ai deja cont? Conectează-te",
    loginSuccessful: "Conectare reușită",
    loginAsAdminFounder: "Conectare ca Administrator-Fondator",
    incorrectPhoneOrPassword: "Număr de telefon sau parolă incorectă",
    passwordsDoNotMatch: "Parolele nu se potrivesc",
    enterNameAndSurname: "Introduceți prenumele și numele",
    userWithPhoneExists: "Utilizatorul cu acest număr de telefon există deja",
    registrationSuccessful: "Înregistrare reușită",
    enterPhoneAndPassword: "Introduceți numărul de telefon și parola",
    
    // Password reset
    forgotPassword: "Ai uitat parola?",
    resetPassword: "Resetare parolă",
    reset: "Resetare",
    confirm: "Confirmare",
    enterPhone: "Introduceți numărul de telefon",
    phoneNotRegistered: "Numărul de telefon nu este înregistrat",
    backToLogin: "Înapoi la conectare",
    verificationCodeSent: "Cod de verificare trimis:",
    verifyCode: "Verificare cod",
    enterVerificationCode: "Introduceți codul de verificare",
    newPassword: "Parolă nouă",
    confirmNewPassword: "Confirmă parola nouă",
    incorrectCode: "Cod incorect",
    passwordResetSuccess: "Parola a fost resetată cu succes",
    useTemporaryPassword: "Utilizați parola temporară: 00000000",
    temporaryPasswordLogin: "Conectare cu parolă temporară",
    pleaseChangePassword: "Vă rugăm să schimbați parola în setări",

    // Language selector
    language: "Limbă",
    ukrainian: "Ucraineană",
    english: "Engleză",
    polish: "Poloneză",
    german: "Germană",
    romanian: "Română",
    
    // General
    home: "Acasă",
    search: "Căutare",
    notifications: "Notificări",
    messages: "Mesaje",
    profile: "Profil",
    settings: "Setări",
    
    // Menu
    menu: "Meniu",
    categories: "Categorii",
    photographers: "Fotografi",
    videographers: "Videografi",
    musicians: "Muzicieni",
    hosts: "Prezentatori",
    pyrotechnicians: "Pirotehniști",
    
    // Misc
    findContacts: "Găsește contacte",
    expandNetwork: "Extinde-ți rețeaua",
    findClientsPartners: "Găsește noi clienți și parteneri pentru colaborare"
  }
};

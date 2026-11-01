// ============================================================
//  FIREBASE SETTINGS
// ------------------------------------------------------------
//  Set to null to run the app in DEMO MODE (data saved in this
//  browser only). These values are safe to be public: the
//  security rules in firestore.rules are what protect the data.
//  From: Firebase console > Project settings > Your apps > Web app
// ============================================================

window.FIREBASE_CONFIG = {

  apiKey: "AIzaSyCfdqqwXajxOuVESO_DZBc2dfGiTlDQoT0",

  authDomain: "chapters-library.firebaseapp.com",

  projectId: "chapters-library",

  storageBucket: "chapters-library.firebasestorage.app",

  messagingSenderId: "1061656045507",

  appId: "1:1061656045507:web:1ca837fc4bd67303b43f76"

};

// ============================================================
//  OWNER EMAIL: the first author.
//  Whoever signs up with this email becomes an author straight
//  away. After that, authors make other authors inside the app.
//  Put the SAME email in firestore.rules (search for OWNER).
//  Sign up with it before sharing the app with anyone.
// ============================================================

window.OWNER_EMAIL = 'nambiararyan24@gmail.com';

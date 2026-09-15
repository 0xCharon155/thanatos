import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp();
export const db = getFirestore();
export { FieldValue };

export const altarRef = () => db.doc("altar_state/current");

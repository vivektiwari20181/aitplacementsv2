import { showNotification } from "@mantine/notifications";

export const showCommingSoon = () =>
  showNotification({
    title: "Comming Soon",
    message: "this feature is not available yet",
    color: "lime",
  });

export const NEXTAUTH_URL = process.env.NEXTAUTH_URL;
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
export const SECRET_PASSPHRASE = process.env.SECRET_PASSPHRASE;
export const DATABASE_URL = process.env.DATABASE_URL;

export const REACT_APP_AWS_ACCESS_KEY = process.env.REACT_APP_AWS_ACCESS_KEY;
export const REACT_APP_AWS_SECRET_ACCESS_KEY =
  process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;
export const REACT_APP_AWS_REGION = process.env.REACT_APP_AWS_REGION;
export const REACT_APP_AWS_BUCKET_ID = process.env.REACT_APP_AWS_BUCKET_ID;

export const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
export const AZURE_AD_CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
export const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID;

export const JWT_TOKEN = process.env.JWT_TOKEN!;
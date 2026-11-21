import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Share } from 'react-native';
import { buildSafeFileName, normalizeWhatsAppPhone } from './formatters';

export async function shareTextToWhatsApp(
  text: string,
  phone?: string
): Promise<void> {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone ? normalizeWhatsAppPhone(phone) : '';

  const deepLink = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
    : `whatsapp://send?text=${encodedText}`;

  try {
    const canOpen = await Linking.canOpenURL(deepLink);
    if (canOpen) {
      await Linking.openURL(deepLink);
      return;
    }
  } catch {
    // Lanjut ke fallback wa.me atau native Share sheet
  }

  if (cleanPhone) {
    const webUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    try {
      const canOpenWeb = await Linking.canOpenURL(webUrl);
      if (canOpenWeb) {
        await Linking.openURL(webUrl);
        return;
      }
    } catch {
      // Lanjut ke Share sheet
    }
  }

  await Share.share({ message: text });
}

export async function shareHtmlAsPdf(
  html: string,
  dialogTitle: string,
  fileName?: string
): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    await Print.printAsync({ html });
    return;
  }

  const safeFileName = buildSafeFileName(fileName || dialogTitle, 'pdf');
  let shareUri = uri;

  try {
    const sourceFile = new File(uri);
    const targetFile = new File(Paths.cache, safeFileName);
    if (sourceFile.uri !== targetFile.uri) {
      if (targetFile.exists) {
        targetFile.delete();
      }
      await sourceFile.move(targetFile, { overwrite: true });
      shareUri = targetFile.uri;
    }
  } catch {
    shareUri = uri;
  }

  // Biarkan file cache tetap ada setelah shareAsync karena WhatsApp membaca URI secara asinkron
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });
}

export async function shareCsvFile(
  csvContent: string,
  fileName: string,
  dialogTitle: string
): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Fitur bagikan file tidak tersedia di perangkat ini.');
  }

  const safeFileName = buildSafeFileName(fileName, 'csv');
  const csvFile = new File(Paths.cache, safeFileName);
  csvFile.create({ intermediates: true, overwrite: true });
  await csvFile.write(csvContent);
  await Sharing.shareAsync(csvFile.uri, {
    mimeType: 'text/csv',
    dialogTitle,
  });
}

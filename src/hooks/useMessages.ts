import {useEffect, useCallback} from 'react';
import useMessageStore from '../store/useMessageStore';
import useSettingsStore from '../store/useSettingsStore';

const VARIANT_TO_PACKAGE = {
  whatsapp: 'com.whatsapp',
  business: 'com.whatsapp.w4b',
} as const;

export default function useMessages() {
  const {
    contacts,
    currentMessages,
    loading,
    fetchContacts,
    fetchMessages,
    searchMessages,
  } = useMessageStore();
  const selectedVariant = useSettingsStore(s => s.selectedVariant);
  const packageName = VARIANT_TO_PACKAGE[selectedVariant];

  useEffect(() => {
    fetchContacts(packageName);
  }, [fetchContacts, packageName]);

  const search = useCallback(
    (query: string) => {
      return searchMessages(query, packageName);
    },
    [searchMessages, packageName],
  );

  return {
    contacts,
    messages: currentMessages,
    loading,
    fetchContacts: () => fetchContacts(packageName),
    fetchMessages: (contactName: string) =>
      fetchMessages(contactName, packageName),
    search,
  };
}

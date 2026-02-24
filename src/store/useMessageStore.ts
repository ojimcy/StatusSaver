import {create} from 'zustand';
import type {DeletedMessage, MessageFilter} from '../types';
import {
  getMessages,
  getMessagesByContact,
  getUniqueContacts,
} from '../services/MessageService';

interface MessageState {
  contacts: {name: string; count: number; lastMessage: string}[];
  currentMessages: DeletedMessage[];
  filter: MessageFilter;
  loading: boolean;

  fetchContacts: () => Promise<void>;
  fetchMessages: (contactName: string) => Promise<void>;
  setFilter: (filter: Partial<MessageFilter>) => void;
  searchMessages: (query: string) => Promise<void>;
}

const initialFilter: MessageFilter = {
  searchQuery: '',
  contactName: null,
  dateFrom: null,
  dateTo: null,
};

const useMessageStore = create<MessageState>((set, get) => ({
  contacts: [],
  currentMessages: [],
  filter: initialFilter,
  loading: false,

  fetchContacts: async () => {
    set({loading: true});
    try {
      const contacts = await getUniqueContacts();
      set({contacts, loading: false});
    } catch (error) {
      console.error('useMessageStore.fetchContacts failed:', error);
      set({loading: false});
    }
  },

  fetchMessages: async (contactName: string) => {
    set({loading: true});
    try {
      const messages = await getMessagesByContact(contactName);
      set({currentMessages: messages, loading: false});
    } catch (error) {
      console.error('useMessageStore.fetchMessages failed:', error);
      set({loading: false});
    }
  },

  setFilter: (partial: Partial<MessageFilter>) => {
    const {filter} = get();
    set({filter: {...filter, ...partial}});
  },

  searchMessages: async (query: string) => {
    set({loading: true});
    try {
      const {filter} = get();
      const updatedFilter: MessageFilter = {...filter, searchQuery: query};
      const messages = await getMessages(updatedFilter);
      set({currentMessages: messages, filter: updatedFilter, loading: false});
    } catch (error) {
      console.error('useMessageStore.searchMessages failed:', error);
      set({loading: false});
    }
  },
}));

export default useMessageStore;

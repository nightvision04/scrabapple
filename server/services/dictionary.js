// server/services/dictionary.js
const fs = require('fs').promises;
const path = require('path');

class Dictionary {
    constructor() {
        if (Dictionary.instance) {
            return Dictionary.instance;
        }
        
        this.words = new Set();
        this.isLoaded = false;
        this.loadPromise = null;
        Dictionary.instance = this;
    }

    async initialize() {
        if (this.isLoaded) {
            return;
        }

        if (this.loadPromise) {
            return this.loadPromise;
        }

        console.log('Dictionary: Starting initial dictionary load');
        this.loadPromise = this.loadDictionary();
        await this.loadPromise;
        this.isLoaded = true;
        console.log('Dictionary: Initialization complete');
    }

    async loadDictionary() {
        try {
            const filePath = path.join(__dirname, '..', 'words.txt');
            const data = await fs.readFile(filePath, 'utf8');
            const words = data.split(/\r?\n/).map(word => word.trim().toUpperCase());
            
            this.words = new Set(words);
            console.log(`Dictionary: Successfully loaded ${this.words.size} words`);
        } catch (error) {
            console.error('Dictionary: Error loading dictionary file:', error);
            throw error;
        }
    }

    isValidWord(word) {
        if (!this.isLoaded) {
            throw new Error('Dictionary not initialized');
        }
        return this.words.has(word.toUpperCase());
    }

    getAllWords() {
        if (!this.isLoaded) {
            throw new Error('Dictionary not initialized');
        }
        return Array.from(this.words);
    }
}

const dictionaryInstance = new Dictionary();

module.exports = dictionaryInstance;
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Transaction {
  date: Date;
  montant: number;
  solde: number;
  devise: string;
  contrepartie: string;
  compteContrepartie: string;
  typeOperation: string;
  communication: string;
  compteDonneurOrdre: string;
}

interface MonthlyData {
  [key: string]: CategoryData;
}

interface CategoryData {
  descriptions: {
    [category: string]: string;
  };
  [category: string]: number | { [category: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class CsvService {
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  transactions$ = this.transactionsSubject.asObservable();

  async parseCSV(file: File): Promise<void> {
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(';');
    //console.log("lines",lines);
    
    const transactions: Transaction[] = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(';').map(value => value.trim());
        const [day, month, year] = values[0].split('/').map(Number);
        return {
          date: new Date(year, month - 1, day),
          montant: parseFloat(values[1].replace(',', '.')),
          solde: parseFloat(values[2].replace(',', '.')),
          devise: values[3],
          contrepartie: values[4],
          compteContrepartie: values[5],
          typeOperation: values[6],
          communication: values[7],
          compteDonneurOrdre: values[8]
        };
      })
      .filter(transaction => !isNaN(transaction.montant));

    this.transactionsSubject.next(transactions);
  }

  getMonthlyExpensesByCategory(transactions: Transaction[]): MonthlyData {
    const monthlyData: MonthlyData = {};
    
    transactions.forEach(transaction => {
      if (transaction.montant < 100000) {
        const month = transaction.date.toLocaleString('fr-FR', { month: 'long' });
        const category = this.categorizeTransaction(transaction);
        const description = this.getLongestWord(transaction);
        
        if (!monthlyData[month]) {
          monthlyData[month] = {
            descriptions: {}
          };
        }
        
        if (!monthlyData[month][category]) {
          monthlyData[month][category] = 0;
          monthlyData[month].descriptions[category] = description;
        }
        
        monthlyData[month][category] = 
          (monthlyData[month][category] as number) + transaction.montant;
      }
    });

    return monthlyData;
  }

  private getLongestWord(transaction: Transaction): string {
    const text = `${transaction.contrepartie} ${transaction.communication}`.toLowerCase();
    const mots = text.split(/[\s,.-]+/)
      .filter(mot => mot.length > 2)
      .filter(mot => !this.MOTS_A_IGNORER.includes(mot.toLowerCase()))
      .filter(mot => !/\d/.test(mot)); // Ignorer les mots contenant des chiffres
      ;

    if (mots.length === 0) return 'Autres';
    console.log("mots",mots);

    return mots.reduce((motLePlusLong, motActuel) => 
      motActuel.length > motLePlusLong.length ? motActuel : motLePlusLong
    );
  }

  private readonly MOTS_A_IGNORER = [
    "achatbancontact", "mistercash", "belnum", "rodecartex", "achatmaestro",
    "renceing", "retraitbancontact", "virementeurop", "domiciliationeurop",
    "xxxxxxxx", "bruxelles", "bank", "retraitself", "avisenannexe",
    "virement", "retraitmaestro", "xxxxxx", "fimaser", "bancontact", "contactless",
    "appointements", "association", "avantages", "bar", "belgrade", "brussels", "centre",
    "champion", "contrat", "couleur", "courses", "crelan", "domiciliation", "ecommerce",
    "economie", "facture", "flawinne", "floreffe", "gembloux", "interruption", "kuringen",
    "mensuelle", "oiseau", "paiement", "performance", "permanent", "salzinnes", "schaerbeek",
    "service", "wallone", "belgrad", "bouge", "brussel", "carte", "eur", "faveur", "loisirs",
    "louvain", "malonne", "namur", "precedent", "suarlee", "wemmel", "votre",
    "undefined", "virement", "donneur", "notprovided", "communication"
  ].map(mot => mot.toLowerCase());

  private categorizeTransaction(transaction: Transaction): string {
    const text = `${transaction.contrepartie} ${transaction.communication}`.toLowerCase();
    
    // Vérifier d'abord les catégories prédéfinies
    if (text.includes('carrefour') || text.includes('delhaize') || text.includes('colruyt')) {
      return 'Alimentation';
    }
    if (text.includes('sncb') || text.includes('stib') || text.includes('essence')) {
      return 'Transport';
    }
    if (text.includes('loyer') || text.includes('electricite') || text.includes('eau')) {
      return 'Logement';
    }
    if (text.includes('cinema') || text.includes('restaurant') || text.includes('sport')) {
      return 'Loisirs';
    }
    if (text.includes('pharmacie') || text.includes('medecin') || text.includes('hopital')) {
      return 'Santé';
    }

    // Si aucune catégorie prédéfinie, trouver le mot le plus long
    const mots = text.split(/[\s,.-]+/)
      .filter(mot => mot.length > 2) // Ignorer les mots trop courts
      .filter(mot => !this.MOTS_A_IGNORER.includes(mot.toLowerCase()))
      .filter(mot => !/\d/.test(mot)); // Ignorer les mots contenant des chiffres

    if (mots.length === 0) return 'Autres';

    console.log("mots categorize", mots);

    return mots.reduce((motLePlusLong, motActuel) => 
      motActuel.length > motLePlusLong.length ? motActuel : motLePlusLong
    );
  }

  getCurrentTransactions(): Transaction[] {
    return this.transactionsSubject.value;
  }

  getAnnualExpensesByCategory(transactions: Transaction[]): MonthlyData {
    const annualData: MonthlyData = {};
    
    transactions.forEach(transaction => {
      const year = transaction.date.getFullYear().toString();
      this.addTransactionToData(transaction, year, annualData);
    });

    return annualData;
  }

  getWeeklyExpensesByCategory(transactions: Transaction[]): MonthlyData {
    const weeklyData: MonthlyData = {};
    
    transactions.forEach(transaction => {
      const date = transaction.date;
      const weekNumber = this.getWeekNumber(date);
      const weekLabel = `Semaine ${weekNumber} - ${date.getFullYear()}`;
      this.addTransactionToData(transaction, weekLabel, weeklyData);
    });

    return weeklyData;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private addTransactionToData(transaction: Transaction, period: string, data: MonthlyData) {
    if (transaction.montant < 100000) {
      const category = this.categorizeTransaction(transaction);
      const description = this.getLongestWord(transaction);
      
      if (!data[period]) {
        data[period] = {
          descriptions: {}
        };
      }
      
      if (!data[period][category]) {
        data[period][category] = 0;
        data[period].descriptions[category] = description;
      }
      
      data[period][category] = 
        (data[period][category] as number) + transaction.montant;
    }
  }
} 
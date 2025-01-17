import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { CsvService } from '../services/csv.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

Chart.register(...registerables);

interface MonthlyData {
  [key: string]: {
    descriptions: {
      [category: string]: string;
    };
    [category: string]: number | { [category: string]: string };
  };
}

interface ChartData {
  labels?: string[];
  datasets?: {
    label?: string;
    data: number[];
    backgroundColor: string;
    customData: { description: string }[];
  }[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private chart: Chart | null = null;
  private subscription: Subscription;
  public hasLoadedData = false;
  showCustomCategories = true;
  categoryFilter: string = '';
  private allCategories: string[] = [];
  minAmount: number = -20000;
  maxAmount: number = 20000;
  currentMinAmount: number = -20000;
  currentMaxAmount: number = 20000;
  selectedPeriodicity: 'annual' | 'monthly' | 'weekly' = 'monthly';
  showImportAlert: boolean = false;

  constructor(private csvService: CsvService) {
    this.subscription = this.csvService.transactions$.subscribe(transactions => {
      if (transactions.length > 0) {
        this.hasLoadedData = true;
        this.updateChart(transactions);
      }
    });
  }

  ngOnInit() {
    this.createStackedChart();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.chart) {
      this.chart.destroy();
    }
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      ResizeObserver && ResizeObserver.prototype.disconnect();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type === 'text/csv') {
        this.csvService.parseCSV(file);
      } else {
        alert('Veuillez sélectionner un fichier CSV');
      }
    }
  }

  private adjustLegendHeight() {
    const legendContainer = document.querySelector('.legend-container-horizontal') as HTMLElement;
    const chartContainer = document.querySelector('.chart-container') as HTMLElement;
    if (!legendContainer || !chartContainer) return;

    // Calculer la hauteur nécessaire pour la légende
    const legendItems = legendContainer.querySelectorAll('.chartjs-legend li');
    const itemHeight = 30; // hauteur approximative d'un élément de légende
    const itemsPerRow = Math.floor(legendContainer.clientWidth / 200); // 200px est la largeur minimale d'un item
    const rows = Math.ceil(legendItems.length / itemsPerRow);
    const neededHeight = rows * itemHeight + 40; // 40px pour le padding

    // Ajuster la hauteur de la légende
    const maxLegendHeight = 300; // hauteur maximale pour la légende
    const newLegendHeight = Math.min(neededHeight, maxLegendHeight);
    legendContainer.style.height = `${newLegendHeight}px`;

    // Ajuster la hauteur du canvas en conséquence
    const canvasElement = chartContainer.querySelector('canvas') as HTMLCanvasElement;
    if (canvasElement) {
      const containerHeight = chartContainer.clientHeight;
      canvasElement.style.height = `${containerHeight - newLegendHeight - 20}px`; // 20px pour le gap
    }
  }

  private createStackedChart() {
    const ctx = document.getElementById('stackedChart') as HTMLCanvasElement;
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'],
        datasets: [
          {
            label: 'Alimentation',
            data: [300, 280, 350, 320, 290, 310],
            backgroundColor: '#FF6384',
          },
          {
            label: 'Transport',
            data: [150, 170, 160, 140, 165, 155],
            backgroundColor: '#36A2EB',
          },
          {
            label: 'Logement',
            data: [800, 800, 800, 800, 800, 800],
            backgroundColor: '#FFCE56',
          },
          {
            label: 'Loisirs',
            data: [200, 250, 180, 220, 240, 190],
            backgroundColor: '#4BC0C0',
          },
          {
            label: 'Santé',
            data: [100, 80, 120, 90, 110, 95],
            backgroundColor: '#9966FF',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true
          },
          y: {
            stacked: true
          }
        },
        plugins: {
          legend: {
            position: 'bottom' as const,
            align: 'start' as const,
            labels: {
              boxWidth: 12,
              padding: 10,
              font: {
                size: 11
              }
            },
            display: true,
            onClick: function() { return; }
          }
        }
      }
    });

    // Observer les changements de taille
    const resizeObserver = new ResizeObserver(() => {
      this.adjustLegendHeight();
    });

    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }

    // Ajuster initialement la hauteur
    setTimeout(() => {
      this.adjustLegendHeight();
    }, 100);
  }

  private updateChart(transactions: any[]) {
    if (!this.chart || !this.chart.data || !this.chart.data.datasets) return;

    const filteredTransactions = transactions.filter(t => {
      const amount = Math.abs(t.montant);
      return amount >= this.currentMinAmount && amount <= this.currentMaxAmount;
    });

    let monthlyData: MonthlyData;
    let periods: string[];
    
    switch (this.selectedPeriodicity) {
      case 'annual':
        monthlyData = this.csvService.getAnnualExpensesByCategory(filteredTransactions);
        periods = Object.keys(monthlyData).sort();
        break;
      case 'weekly':
        monthlyData = this.csvService.getWeeklyExpensesByCategory(filteredTransactions);
        periods = Object.keys(monthlyData).sort();
        break;
      case 'monthly':
      default:
        monthlyData = this.csvService.getMonthlyExpensesByCategory(filteredTransactions);
        periods = Object.keys(monthlyData);
        break;
    }

    const defaultCategories = ['Alimentation', 'Transport', 'Logement', 'Loisirs', 'Santé', 'Autres'];
    
    const customCategories = new Set<string>();
    periods.forEach(period => {
      Object.keys(monthlyData[period]).forEach(key => {
        if (key !== 'descriptions' && !defaultCategories.includes(key)) {
          customCategories.add(key);
        }
      });
    });

    this.allCategories = this.showCustomCategories 
      ? [...defaultCategories, ...Array.from(customCategories)].sort()
      : [...defaultCategories].sort();

    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#FF9999', '#66B2FF', '#99FF99', '#FF99CC', '#99CCFF', '#FFB366',
      '#C299FF', '#FF99FF', '#99FFCC', '#FFCC99'
    ];

    const datasets = this.allCategories.map((category, index) => {
      const data = periods.map(period => {
        const value = monthlyData[period][category];
        return typeof value === 'number' ? value : 0;
      });

      return {
        label: category,
        data: data,
        backgroundColor: colors[index % colors.length],
        customData: periods.map(period => ({
          description: monthlyData[period].descriptions[category] || 'Pas de description'
        }))
      };
    });

    this.chart.data.labels = periods;
    this.chart.data.datasets = datasets;
    this.chart.update('active');
  }

  filterCategories() {
    if (!this.hasLoadedData) {
      this.showImportMessage();
      return;
    }
    const chartData = this.chart?.data as ChartData | undefined;
    if (!chartData?.datasets) return;

    const filteredCategories = this.allCategories.filter(category =>
      category.toLowerCase().includes(this.categoryFilter.toLowerCase())
    );

    // Tri des datasets
    chartData.datasets.sort((a, b) => {
      if (!a.label || !b.label) return 0;

      // Si le filtre est vide, trier alphabétiquement
      if (this.categoryFilter.trim() === '') {
        return a.label.localeCompare(b.label);
      }

      // Sinon, mettre les catégories filtrées en premier
      const aIncluded = filteredCategories.includes(a.label);
      const bIncluded = filteredCategories.includes(b.label);
      
      if (aIncluded && !bIncluded) return -1;
      if (!aIncluded && bIncluded) return 1;
      
      // Si les deux sont inclus ou exclus, trier alphabétiquement
      return a.label.localeCompare(b.label);
    });

    // Mettre à jour la visibilité
    chartData.datasets.forEach((dataset, index) => {
      if (dataset.label) {
        const visible = filteredCategories.includes(dataset.label);
        const meta = this.chart?.getDatasetMeta(index);
        if (meta) {
          meta.hidden = !visible;
        }
      }
    });

    this.chart?.update();
  }

  toggleCustomCategories() {
    this.showCustomCategories = !this.showCustomCategories;
    if (this.hasLoadedData) {
      this.updateChart(this.csvService.getCurrentTransactions());
    }
  }

  public transformValue(value: number): number {
    const sign = Math.sign(value);
    const absValue = Math.abs(value);
    
    let transformed = sign * (Math.pow(1.000461, absValue) - 1);
    
    transformed = transformed * 2;
    
    transformed = Math.max(-20000, Math.min(20000, transformed));
    
    return Math.round(transformed);
  }

  public inverseTransform(value: number): number {
    const clampedValue = Math.max(-20000, Math.min(20000, value));
    
    const scaledValue = clampedValue / 2;
    
    const sign = Math.sign(scaledValue);
    const absValue = Math.abs(scaledValue);
    
    const inverse = sign * Math.log(absValue + 1) / Math.log(1.0008);
    
    return Math.round(Math.max(-20000, Math.min(20000, inverse)));
  }

  onAmountRangeChange() {
    if (!this.hasLoadedData) {
      this.showImportMessage();
      return;
    }
    const transformedMin = this.transformValue(this.currentMinAmount);
    const transformedMax = this.transformValue(this.currentMaxAmount);
    
    const transactions = this.csvService.getCurrentTransactions();
    if (transactions.length > 0) {
      const filteredTransactions = transactions.filter(t => {
        const amount = t.montant;
        return amount >= transformedMin && amount <= transformedMax;
      });
      this.updateChart(filteredTransactions);
    }
  }

  onPeriodicityChange() {
    if (!this.hasLoadedData) {
      this.showImportMessage();
      return;
    }
    const transactions = this.csvService.getCurrentTransactions();
    if (transactions.length > 0) {
      this.updateChart(transactions);
    }
  }

  private showImportMessage() {
    if (!this.hasLoadedData) {
      this.showImportAlert = true;
      setTimeout(() => {
        this.showImportAlert = false;
      }, 3000); // Le message disparaît après 3 secondes
    }
  }
} 
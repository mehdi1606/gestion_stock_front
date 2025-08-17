import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// module
import { EcommerceRoutingModule } from './ecommerce-routing.module';
import { UIModule } from '../../shared/ui/ui.module';
import { WidgetModule } from '../../shared/widget/widget.module';

// bootstrap module
import { NgxSliderModule } from 'ngx-slider-v2';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ModalModule } from 'ngx-bootstrap/modal';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';
import { FournisseursComponent } from './customers/fournisseurs.component';
// dropzone
import { DropzoneModule } from 'ngx-dropzone-wrapper';
import { DROPZONE_CONFIG } from 'ngx-dropzone-wrapper';
import { DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomerOrdersComponent } from './customer-orders/customer-orders.component';
import { ArticlesComponent } from './products/articles.component';
import { StockInventoryComponent } from './stock-inventory/stock-inventory.component';
import { StockMovementsComponent } from './orders/stock-movements.component';

const DEFAULT_DROPZONE_CONFIG: DropzoneConfigInterface = {
  // Change this to your upload POST address:
  url: 'https://httpbin.org/post',
  maxFilesize: 50,
  acceptedFiles: 'image/*'
};

@NgModule({
  // tslint:disable-next-line: max-line-length
  declarations: [ArticlesComponent, StockInventoryComponent,StockMovementsComponent, FournisseursComponent ,CustomerOrdersComponent],
  imports: [
    CommonModule,
    EcommerceRoutingModule,
    TabsModule.forRoot(),
    ModalModule.forRoot(),
    FormsModule,
    SlickCarouselModule,
    MatSnackBarModule,
    BsDropdownModule.forRoot(),
    ReactiveFormsModule,
    UIModule,
    WidgetModule,
    NgxSliderModule,
    NgSelectModule,
    PaginationModule.forRoot(),
    BsDatepickerModule.forRoot(),
    DropzoneModule
  ],
  providers: [
    DatePipe,
    {
      provide: DROPZONE_CONFIG,
      useValue: DEFAULT_DROPZONE_CONFIG
    }
  ],

})
export class EcommerceModule { }

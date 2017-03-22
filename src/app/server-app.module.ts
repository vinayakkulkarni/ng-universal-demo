import { NgModule, APP_BOOTSTRAP_LISTENER, PlatformRef, ApplicationRef } from '@angular/core';
import { ServerModule, PlatformState } from '@angular/platform-server';
import { ServerTransferStateModule } from '../modules/transfer-state/server-transfer-state.module';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { TransferState } from '../modules/transfer-state/transfer-state';
import { BrowserModule } from '@angular/platform-browser';

export function boot(state: TransferState, applicationRef: ApplicationRef) {
  return function () {
    applicationRef.isStable
      .filter((stable: boolean) => stable)
      .first()
      .subscribe(() => {
        state.inject();
      });
  }
}

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({
      appId: 'my-app-id'
    }),
    ServerModule,
    ServerTransferStateModule,
    AppModule
  ],
  providers: [
    {
      provide: APP_BOOTSTRAP_LISTENER,
      multi: true,
      useFactory: boot,
      deps: [
        TransferState,
        ApplicationRef
      ]
    }
  ]
})
export class ServerAppModule {}

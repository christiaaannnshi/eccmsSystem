import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { VerifyCodeComponent } from './verify-code.component';

describe('VerifyCodeComponent', () => {
  let component: VerifyCodeComponent;
  let fixture: ComponentFixture<VerifyCodeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      declarations: [VerifyCodeComponent]
    });
    fixture = TestBed.createComponent(VerifyCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

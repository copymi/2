import { Alert, Platform, NativeModules } from 'react-native';
import firebase from "react-native-firebase";
const { InAppUtils } = NativeModules;
import InAppBilling from 'react-native-billing';
import DeviceInfo from 'react-native-device-info';
import iapReceiptValidator from 'iap-receipt-validator';

import { purchaseComplete, activateTrial, restorePurchanse, cancelPurchase } from '../helpers/Analytics';

const uniqueId = DeviceInfo.getUniqueID();

class Subscribe {
  productId = {
    ios: 'com.XXX.subscribe.full.version',
    android: __DEV__ ? 'android.test.purchased' : 'com.XXX.www.subscribe.full.version'
  };

  ItunesSecret = '82f8eXXXXXXXXXXX64cfe1';

  restorePurchases = () => {
    if (Platform.OS !== 'ios') return;

    InAppUtils.restorePurchases((error, response) => {
      if(error) {
        return Alert.alert('Itunes Error', 'Could not connect to itunes store.');
      } else if (response.length === 0) {
        Alert.alert('No Purchases', "We didn't find any purchases to restore.");
        return;
      }

      Alert.alert('Restore Successful', 'Successfully restores all your purchases.');

      response.forEach((purchase) => {
        if (purchase.productIdentifier === this.productId.ios) {
          console.log('restorePurchases', purchase);
          this.activate({restorePurchases: true});
        }
      });
    });
  };

  activate = ({transactionReceipt = null, restorePurchases = false}) => {
    const update = {
      transactionReceipt,
      hasSubscribe: true,
      subscribeIsPurchase: false,
    };

    if (restorePurchases) {
      restorePurchanse();
      delete update.subscribeIsPurchase
    } else {
      activateTrial();
    }

    firebase
      .database()
      .ref(`users/${uniqueId}`)
      .update(update);
  };

  traderProfileActive = (dateOfEnd) => {
    firebase
      .database()
      .ref(`users/${uniqueId}`)
      .update({
        hasSubscribe: true,
        traderProfileExpireDate: dateOfEnd
      });
  };

  purchaseProduct = async ({ onFinish, setPayDisableToggle }) => {
    setPayDisableToggle(true);

    if (Platform.OS === 'ios') {
      InAppUtils.loadProducts([this.productId.ios], (error) => {
        if (error) {
          console.log(error);
          return setPayDisableToggle(false);
        }
        InAppUtils.canMakePayments(canMakePayments => {
          if (!canMakePayments) {
            console.log({canMakePayments});
            return this.purchaseNotAllowed(setPayDisableToggle);
          }
          InAppUtils.purchaseProduct(this.productId.ios, (error, response) => {
            if (error || !(response && response.productIdentifier)) {
              console.log(error);
              return setPayDisableToggle(false);
            }

            console.log('InAppUtils', response);
            this.activate({transactionReceipt: response.transactionReceipt});
            onFinish();
          });
        });
      });
    } else {
      try {
        await InAppBilling.open();
        const result = await InAppBilling.purchase(this.productId.android);

        console.log('InAppBilling', result);
        this.activate({});
        onFinish();
      } catch (err) {
        console.log(err);
        setPayDisableToggle(false);
      } finally {
        await InAppBilling.close();
      }
    }
  };

  purchaseNotAllowed(setPayDisableToggle) {
    Alert.alert(
      'Not Allowed',
      'This device is not allowed to make purchases. Please check restrictions on device'
    );
    setPayDisableToggle(false);
  }

  complitePurchase() {
    purchaseComplete();
    firebase
      .database()
      .ref(`users/${uniqueId}`)
      .update({ subscribeIsPurchase: true });
  }

  cancelPurchase() {
    cancelPurchase();
    firebase
      .database()
      .ref(`users/${uniqueId}`)
      .update({
        hasSubscribe: false,
        subscribeIsPurchase: null
      });
  }

  validateSubscribe = async (userData) => {
    if (Platform.OS === 'ios') {
      const validateReceipt = iapReceiptValidator(this.ItunesSecret, !__DEV__);
      try {
        const validationData = await validateReceipt(userData.transactionReceipt);
        console.log({validationData});
        if (
          validationData &&
          validationData.latest_receipt_info &&
          validationData.latest_receipt_info.expires_date &&
          validationData.latest_receipt_info.is_trial_period
        ) {
          const expires_date = new Date(parseInt(validationData.latest_receipt_info.expires_date));
          const is_trial_period = validationData.latest_receipt_info.is_trial_period === 'true';
          const today = new Date();

          if (expires_date > today) {
            if (!is_trial_period) {
              this.complitePurchase()
            }
          } else {
            this.cancelPurchase()
          }
        }
      } catch(err) {
        console.log(err.valid, err.error, err.message)
      }
    } else {
      try {
        await InAppBilling.open();

        const {autoRenewing, purchaseTime} = await InAppBilling.getSubscriptionTransactionDetails(this.productId.android);

        if (autoRenewing) {
          const today = new Date();
          const _purchaseTime = new Date(purchaseTime);
          const trialDay = 3;

          _purchaseTime.setDate(_purchaseTime.getDate()+trialDay);

          if (today > _purchaseTime) {
            this.complitePurchase()
          }
        } else {
          this.cancelPurchase()
        }
      } catch (e) {
        console.log(e)
      } finally {
        await InAppBilling.close();
      }
    }
  }
}

export default new Subscribe();

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Variables } from './index';
import InfoCard from './InfoCard';
import Subscribe from '../subscribe/subscribe';

class SubscribeCard extends Component {
  state = {
    payDisabled: false
  };

  setPayDisableToggle = (payDisabled) => {
    this.setState({ payDisabled });
  };

  render() {
    const { payDisabled } = this.state;
    const { style, onFinish } = this.props;

    return (
      <InfoCard
        style={
          style || {
            width: Variables.deviceWidth - 60,
            marginTop: Variables.deviceHeight / 2.5
          }
        }
        title={'Subscribe'}
        subTitle={'& be Rich'}
        desc={
          'Excellent traders work for you. Machine learning makes predictions more effective. Try it for free.'
        }
        btn={'3 Days for Free'}
        onPress={() =>
          Subscribe.purchaseProduct({
            onFinish,
            setPayDisableToggle: this.setPayDisableToggle
          })
        }
        disabled={payDisabled}
      />
    );
  }
}

SubscribeCard.propTypes = {
  style: PropTypes.object,
  onFinish: PropTypes.func
};

SubscribeCard.defaultProps = {
  style: null,
  onFinish: () => {}
};

export default SubscribeCard;
